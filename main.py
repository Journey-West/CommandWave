#!/usr/bin/env python3
"""
CommandWave - Web-based interface for managing terminal sessions with playbooks
"""

import os
import sys
import json
import signal
import atexit
import logging
import argparse
import subprocess
import threading
import glob
import socket
import time
import re
from urllib.parse import quote
from flask import Flask, render_template, request, jsonify, abort, send_from_directory
from flask_socketio import SocketIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), 
              logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'commandwave.log'))],
)
logger = logging.getLogger('commandwave')

# Constants
DEFAULT_PORT = 5000
DEFAULT_TERMINAL_PORT = 7681
TERMINAL_PORT_RANGE = (7682, 7781)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NOTES_DIR = os.path.join(BASE_DIR, 'notes_data')
PLAYBOOKS_DIR = os.path.join(BASE_DIR, 'playbooks')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
TMUX_CONFIG_PATH = os.path.join(BASE_DIR, 'commandwave_theme.tmux.conf')
HOSTNAME = 'localhost'  # Default hostname, will be updated from args

# Create necessary directories if they don't exist
os.makedirs(NOTES_DIR, exist_ok=True)
os.makedirs(PLAYBOOKS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Initialize Flask app
app = Flask(__name__, 
            static_folder=STATIC_DIR, 
            template_folder=TEMPLATES_DIR)

# Store the terminals dictionary in the Flask app for access by blueprints
app.terminals = {}
app.process_lock = threading.Lock()

# Import route blueprints
from routes.playbook_routes import playbook_routes
from routes.variable_routes import variable_routes, VARIABLE_STORAGE_DIR
from routes.terminal_routes import terminal_routes
from routes.sync_routes import sync_routes, init_socketio_events
from routes.notes_routes import notes_routes
from core.sync_utils import init_socketio

def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description='CommandWave - Terminal Management Web Application')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT,
                        help=f'Port to run the web server on (default: {DEFAULT_PORT})')
    parser.add_argument('--use-default-tmux-config', action='store_true',
                        help='Use the default CommandWave tmux configuration')
    parser.add_argument('--hostname', type=str, default='localhost',
                        help='Hostname to use for terminal connections (default: localhost)')
    parser.add_argument('--remote', action='store_true',
                        help='Enable remote access by binding to all interfaces')
    return parser.parse_args()

def is_port_available(port):
    """Check if a port is available to use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOSTNAME, port)) != 0

def find_available_port(start_port, end_port):
    """Find an available port in the specified range."""
    for port in range(start_port, end_port + 1):
        if is_port_available(port) and port not in app.terminals:
            return port
    return None

def start_ttyd_process(port, tmux_session_name, use_tmux_config=False):
    """
    Start a ttyd process linked to a tmux session on the specified port.

    This function creates a new tmux session with the given name, or reuses an existing one if it already exists.
    It then starts a ttyd process linked to this tmux session, and returns the process object.

    :param port: The port number to use for the ttyd process.
    :param tmux_session_name: The name of the tmux session to create or reuse.
    :param use_tmux_config: Whether to use a custom tmux configuration file.
    :return: The ttyd process object, or None if the process could not be started.
    """
    try:
        # First check if the port is actually available
        if not is_port_available(port):
            logger.warning(f"Port {port} is already in use, trying to find an available port")
            new_port = find_available_port(TERMINAL_PORT_RANGE[0], TERMINAL_PORT_RANGE[1])
            if new_port:
                logger.info(f"Found available port {new_port}, using it instead of {port}")
                port = new_port
            else:
                logger.error("Could not find an available port for ttyd")
                return None
                
        # Check if tmux session already exists
        check_session = subprocess.run(
            ['tmux', 'has-session', '-t', tmux_session_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False
        )
        
        # If session exists, use it
        if check_session.returncode == 0:
            logger.info(f"Tmux session {tmux_session_name} already exists, reusing it")
            # If using custom config, source it in the existing session
            if use_tmux_config and os.path.exists(TMUX_CONFIG_PATH):
                try:
                    subprocess.run(
                        ['tmux', 'source-file', '-t', tmux_session_name, TMUX_CONFIG_PATH],
                        check=True
                    )
                    logger.info(f"Applied custom tmux config to existing session {tmux_session_name}")
                except Exception as e:
                    logger.warning(f"Failed to apply tmux config to existing session: {e}")
        else:
            # Create a new tmux session
            tmux_cmd = ['tmux', 'new-session', '-d', '-s', tmux_session_name]
            
            # Add tmux config if enabled
            if use_tmux_config and os.path.exists(TMUX_CONFIG_PATH):
                tmux_cmd.extend(['-f', TMUX_CONFIG_PATH])
                logger.info(f"Creating new tmux session with config: {TMUX_CONFIG_PATH}")
                
            subprocess.run(tmux_cmd, check=True)
            logger.info(f"Created tmux session: {tmux_session_name}")
        
        # Start ttyd linked to the tmux session
        ttyd_cmd = [
            'ttyd', 
            '-W',  # Add writable flag to enable terminal input
            '--port', str(port),
            '--client-option', 'fontSize=12',
            '--client-option', 'disableLeaveAlert=true',
            '--client-option', 'fontFamily=monospace',
            '--client-option', 'rendererType=canvas',
            '--client-option', 'letterSpacing=0',
            '--client-option', 'lineHeight=1',
        ]
        
        # Create helper script for tmux attachment that applies theme
        theme_script_path = os.path.join(BASE_DIR, f'apply_theme_{port}.sh')
        
        with open(theme_script_path, 'w') as f:
            if use_tmux_config and os.path.exists(TMUX_CONFIG_PATH):
                # Script that sources the config before attaching
                f.write('#!/bin/sh\n')
                f.write(f'tmux source-file "{TMUX_CONFIG_PATH}"\n')
                f.write(f'tmux attach-session -t {tmux_session_name}\n')
                logger.info(f"Created tmux helper script with theme at {theme_script_path}")
                os.chmod(theme_script_path, 0o755)  # Make executable
                ttyd_cmd.append(theme_script_path)
            else:
                # Standard attachment without theme
                ttyd_cmd.extend(['tmux', 'attach-session', '-t', tmux_session_name])
            
        # Start the ttyd process
        ttyd_process = subprocess.Popen(
            ttyd_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a moment to ensure the process starts
        time.sleep(0.5)
        
        # Check if process is still running (didn't exit with error)
        if ttyd_process.poll() is not None:
            # Process has exited, get error output
            _, stderr = ttyd_process.communicate()
            logger.error(f"ttyd process exited unexpectedly: {stderr}")
            return None
            
        logger.info(f"Started ttyd on port {port} linked to tmux session {tmux_session_name}")
        return ttyd_process
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to start ttyd process: {e}")
        return None
    except Exception as e:
        logger.error(f"Error starting ttyd process: {e}")
        return None

def send_keys_to_tmux(tmux_session_name, keys):
    """Send keys to a tmux session."""
    try:
        # Ensure keys end with a newline if not already present
        if not keys.endswith('\n'):
            keys += '\n'
            
        # Send keys to the tmux session
        subprocess.run(
            ['tmux', 'send-keys', '-t', tmux_session_name, keys],
            check=True
        )
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to send keys to tmux session {tmux_session_name}: {e}")
        return False
    except Exception as e:
        logger.error(f"Error sending keys to tmux session {tmux_session_name}: {e}")
        return False

def kill_terminal(port):
    """Kill a ttyd process and its associated tmux session."""
    if port not in app.terminals:
        return False
        
    with app.process_lock:
        try:
            terminal_info = app.terminals[port]
            
            # Kill the ttyd process
            if terminal_info['process'] and terminal_info['process'].poll() is None:
                terminal_info['process'].terminate()
                terminal_info['process'].wait(timeout=3)
                logger.info(f"Terminated ttyd process for port {port}")
                
            # Kill the tmux session
            subprocess.run(
                ['tmux', 'kill-session', '-t', terminal_info['tmux_session']],
                check=True
            )
            logger.info(f"Killed tmux session {terminal_info['tmux_session']}")
            
            # Clean up the helper script if it exists
            theme_script_path = os.path.join(BASE_DIR, f'apply_theme_{port}.sh')
            if os.path.exists(theme_script_path):
                try:
                    os.remove(theme_script_path)
                    logger.info(f"Removed helper script: {theme_script_path}")
                except Exception as e:
                    logger.warning(f"Failed to remove helper script {theme_script_path}: {e}")
            
            # Remove from terminals dict
            del app.terminals[port]
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to kill tmux session: {e}")
            return False
        except Exception as e:
            logger.error(f"Error killing terminal on port {port}: {e}")
            return False

def cleanup_all_terminals():
    """Clean up all terminal processes when the application exits."""
    logger.info("Cleaning up all terminal processes...")
    
    # Make a copy of the keys since we'll be modifying the dictionary
    ports = list(app.terminals.keys())
    
    for port in ports:
        kill_terminal(port)
        
    logger.info("Cleanup complete")
    
    # Clean up persisted variable files
    logger.info("Cleaning up persisted variable files...")
    try:
        pattern = os.path.join(VARIABLE_STORAGE_DIR, 'variables_*.json')
        files = glob.glob(pattern)
        for file_path in files:
            try:
                os.remove(file_path)
                logger.info(f"Removed variable file: {file_path}")
            except OSError as e:
                logger.warning(f"Failed to remove variable file {file_path}: {e}")
    except Exception as e:
        logger.error(f"Error cleaning up variable files: {e}")
    logger.info("Variable file cleanup complete")

# Register cleanup function
atexit.register(cleanup_all_terminals)

# Flag to prevent multiple signal handler executions
_shutdown_in_progress = False

def signal_handler(sig, frame):
    """Handle termination signals by cleaning up and exiting."""
    global _shutdown_in_progress
    
    # Prevent multiple executions of the shutdown sequence
    if _shutdown_in_progress:
        return
    
    _shutdown_in_progress = True
    logger.info(f"Received signal {sig}, shutting down...")
    cleanup_all_terminals()
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Register blueprints
app.register_blueprint(playbook_routes)
app.register_blueprint(variable_routes)
app.register_blueprint(terminal_routes)
app.register_blueprint(sync_routes)
app.register_blueprint(notes_routes)

# Initialize SocketIO
socketio = init_socketio(app)
init_socketio_events(socketio)


# Basic routes
@app.route('/')
def index():
    """Render the main application page."""
    return render_template('index.html', 
                          default_terminal_port=app.config.get('DEFAULT_TERMINAL_PORT', DEFAULT_TERMINAL_PORT),
                          hostname=app.config.get('HOSTNAME', HOSTNAME))

@app.route('/healthcheck')
def healthcheck():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'})

@app.route('/api/playbooks/<path:filepath>', methods=['GET'])
def get_playbook_file(filepath):
    """Get a playbook file from any subdirectory within the playbooks directory."""
    # Secure the filepath to prevent directory traversal
    # Ensure the requested file is within the playbooks directory
    abs_path = os.path.abspath(os.path.join(PLAYBOOKS_DIR, filepath))
    if not abs_path.startswith(os.path.abspath(PLAYBOOKS_DIR)):
        return jsonify({
            'success': False,
            'error': 'Invalid file path'
        }), 400
    
    # Check if the file exists
    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        return jsonify({
            'success': False,
            'error': f'File not found: {filepath}'
        }), 404
    
    # Check if it's a markdown file
    if not abs_path.lower().endswith('.md'):
        return jsonify({
            'success': False,
            'error': 'Only .md files are supported'
        }), 400
    
    # Read the file content
    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return jsonify({
            'success': True,
            'filename': os.path.basename(filepath),
            'content': content
        })
    except Exception as e:
        logger.error(f"Error loading playbook {abs_path}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Terminal management endpoints
@app.route('/api/terminals/list', methods=['GET'])
def list_terminals():
    """Get a list of all active terminals."""
    terminal_list = []
    with app.process_lock:
        for port, terminal in app.terminals.items():
            terminal_list.append({
                'port': port,
                'name': terminal.get('name', f'Terminal {port}'),
                'tmux_session': terminal.get('tmux_session', ''),
                'created_at': terminal.get('created_at', 0)
            })
    
    return jsonify({
        'success': True,
        'terminals': terminal_list
    })

@app.route('/api/terminals/new', methods=['POST'])
def new_terminal():
    """Create a new terminal session and return its port."""
    try:
        # Get terminal name from request
        data = request.get_json()
        tab_name = data.get('name', 'Terminal')
        
        # Find an available port
        port = find_available_port(TERMINAL_PORT_RANGE[0], TERMINAL_PORT_RANGE[1])
        if not port:
            logger.error("Could not find available port for new terminal")
            return jsonify({
                'success': False,
                'error': 'No available ports'
            }), 500
            
        # Create the terminal
        tmux_session = f"commandwave-{port}"
        ttyd_process = start_ttyd_process(
            port, 
            tmux_session,
            app.config.get('USE_TMUX_CONFIG', False)
        )
        
        if ttyd_process:
            with app.process_lock:
                app.terminals[port] = {
                    'process': ttyd_process,
                    'tmux_session': tmux_session,
                    'created_at': time.time(),
                    'name': tab_name
                }
                
            logger.info(f"Created new terminal on port {port} with name '{tab_name}'")
            return jsonify({
                'success': True,
                'port': port,
                'name': tab_name
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create terminal process'
            }), 500
    except Exception as e:
        logger.error(f"Error creating new terminal: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/terminals/sendkeys', methods=['POST'])
def send_keys():
    """Send keys to a specific terminal session."""
    data = request.json
    
    if not data or 'port' not in data or 'keys' not in data:
        return jsonify({
            'success': False,
            'error': 'Missing required fields: port, keys'
        }), 400
    
    port = int(data['port'])
    keys = data['keys']
    
    if port not in app.terminals:
        return jsonify({
            'success': False,
            'error': f'Terminal on port {port} not found'
        }), 404
    
    tmux_session = app.terminals[port]['tmux_session']
    
    # Send the keys to the tmux session
    if send_keys_to_tmux(tmux_session, keys):
        return jsonify({'success': True})
    else:
        return jsonify({
            'success': False,
            'error': f'Failed to send keys to terminal on port {port}'
        }), 500

@app.route('/api/terminals/<int:port>', methods=['DELETE'])
def delete_terminal(port):
    """Terminate a terminal session."""
    try:
        # Check if the terminal exists
        if port not in app.terminals:
            return jsonify({
                'success': False,
                'error': 'Terminal not found'
            }), 404
            
        # Kill the terminal
        if kill_terminal(port):
            with app.process_lock:
                if port in app.terminals:
                    del app.terminals[port]
                    
            logger.info(f"Deleted terminal on port {port}")
            return jsonify({
                'success': True
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to delete terminal on port {port}'
            }), 500
    except Exception as e:
        logger.error(f"Error deleting terminal on port {port}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/terminals/delete/<int:port>', methods=['POST'])
def delete_terminal_post(port):
    """Terminate a terminal session (POST endpoint)."""
    return delete_terminal(port)

@app.route('/api/terminals/rename/<int:port>', methods=['POST'])
def rename_terminal(port):
    """Rename a terminal session."""
    try:
        # Check if the terminal exists
        if port not in app.terminals:
            return jsonify({
                'success': False,
                'error': 'Terminal not found'
            }), 404
        
        # Get the new name from the request
        data = request.get_json()
        new_name = data.get('name', f'Terminal {port}')
        
        # Update the terminal name
        with app.process_lock:
            app.terminals[port]['name'] = new_name
            
        logger.info(f"Renamed terminal on port {port} to '{new_name}'")
        return jsonify({
            'success': True
        })
    except Exception as e:
        logger.error(f"Error renaming terminal: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Notes persistence endpoints
@app.route('/api/notes/global', methods=['GET', 'POST'])
def handle_global_notes():
    """Handle GET and POST requests for global notes."""
    notes_file = os.path.join(NOTES_DIR, 'global_notes.txt')
    
    if request.method == 'GET':
        # Read global notes from file
        try:
            if os.path.exists(notes_file):
                with open(notes_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                return jsonify({'success': True, 'content': content})
            else:
                # Return empty content if file doesn't exist
                return jsonify({'success': True, 'content': ''})
        except Exception as e:
            logger.error(f"Error reading global notes: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        # Write global notes to file
        try:
            data = request.json
            if not data or 'content' not in data:
                return jsonify({
                    'success': False, 
                    'error': 'Missing required field: content'
                }), 400
                
            os.makedirs(NOTES_DIR, exist_ok=True)
            with open(notes_file, 'w', encoding='utf-8') as f:
                f.write(data['content'])
            return jsonify({'success': True})
        except Exception as e:
            logger.error(f"Error writing global notes: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notes/tab/<terminal_id>', methods=['GET', 'POST'])
def handle_tab_notes(terminal_id):
    """Handle GET and POST requests for tab-specific notes."""
    # Sanitize terminal_id to prevent directory traversal
    sanitized_id = re.sub(r'[^a-zA-Z0-9\-]', '', terminal_id)
    if sanitized_id != terminal_id:
        return jsonify({'success': False, 'error': 'Invalid terminal ID'}), 400
        
    notes_file = os.path.join(NOTES_DIR, f'tab_notes_{sanitized_id}.txt')
    
    if request.method == 'GET':
        # Read tab notes from file
        try:
            if os.path.exists(notes_file):
                with open(notes_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                return jsonify({'success': True, 'content': content})
            else:
                # Return empty content if file doesn't exist
                return jsonify({'success': True, 'content': ''})
        except Exception as e:
            logger.error(f"Error reading tab notes for {terminal_id}: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        # Write tab notes to file
        try:
            data = request.json
            if not data or 'content' not in data:
                return jsonify({
                    'success': False, 
                    'error': 'Missing required field: content'
                }), 400
                
            os.makedirs(NOTES_DIR, exist_ok=True)
            with open(notes_file, 'w', encoding='utf-8') as f:
                f.write(data['content'])
            return jsonify({'success': True})
        except Exception as e:
            logger.error(f"Error writing tab notes for {terminal_id}: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

# Playbook search and load endpoints
@app.route('/api/playbooks/search', methods=['GET'])
def search_playbooks():
    """Search for lines in playbooks containing the query."""
    query = request.args.get('query', '')
    if not query:
        return jsonify({
            'success': False,
            'error': 'Missing query parameter'
        }), 400
    
    # Search in all .md files in the playbooks directory
    results = []
    try:
        # Create the playbooks directory if it doesn't exist
        os.makedirs(PLAYBOOKS_DIR, exist_ok=True)
        
        # Get all .md files in the playbooks directory
        md_files = glob.glob(os.path.join(PLAYBOOKS_DIR, '**/*.md'), recursive=True)
        
        for file_path in md_files:
            filename = os.path.basename(file_path)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        if query.lower() in line.lower():
                            results.append({
                                'filename': filename,
                                'line_number': i,
                                'line': line.strip()
                            })
            except Exception as e:
                logger.error(f"Error reading file {file_path}: {e}")
                continue
                
        return jsonify({
            'success': True,
            'results': results
        })
    except Exception as e:
        logger.error(f"Error searching playbooks: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/playbooks/save', methods=['POST'])
def save_playbook():
    """Save a playbook file to the playbooks directory."""
    try:
        data = request.get_json()
        if not data or not data.get('filename') or not data.get('content'):
            return jsonify({
                'success': False,
                'error': 'Missing filename or content'
            }), 400
            
        # Sanitize the filename to prevent directory traversal
        filename = data['filename']
        sanitized_filename = os.path.basename(filename)
        
        # If no .md extension, add it
        if not sanitized_filename.endswith('.md'):
            sanitized_filename += '.md'
            
        # Create the file path
        file_path = os.path.join(PLAYBOOKS_DIR, sanitized_filename)
        
        # Write the file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(data['content'])
            
        # Also update the shared playbook state for synchronized access
        with playbook_lock:
            playbooks[sanitized_filename] = {
                'filename': sanitized_filename,
                'content': data['content'],
                'last_modified': time.time(),
                'editor': data.get('editor', 'unknown')
            }
            
        return jsonify({
            'success': True,
            'filename': sanitized_filename
        })
    except Exception as e:
        logger.error(f"Error saving playbook: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/playbooks/load/<path:filename>', methods=['GET'])
def load_playbook(filename):
    """Load a specific playbook file."""
    # Sanitize the filename to prevent directory traversal
    sanitized_filename = os.path.basename(filename)
    if sanitized_filename != filename:
        # Check if it might be in a subdirectory
        parts = filename.split('/')
        if len(parts) > 1 and all(p and not p.startswith('..') for p in parts):
            # It could be a valid subdirectory path, attempt to load
            file_path = os.path.join(PLAYBOOKS_DIR, *parts)
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid filename'
            }), 400
    else:
        # Try to find in root playbooks directory first
        file_path = os.path.join(PLAYBOOKS_DIR, sanitized_filename)
        
        # If not found in root, check if it exists in subdirectories
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            # Search in subdirectories
            for subdir, _, files in os.walk(PLAYBOOKS_DIR):
                if sanitized_filename in files:
                    file_path = os.path.join(subdir, sanitized_filename)
                    break
    
    # Check if the file exists
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        # If still not found, check specifically in tutorials directory as fallback
        tutorials_path = os.path.join(PLAYBOOKS_DIR, 'tutorials', sanitized_filename)
        if os.path.exists(tutorials_path) and os.path.isfile(tutorials_path):
            file_path = tutorials_path
        else:
            return jsonify({
                'success': False,
                'error': f'File not found: {filename}'
            }), 404
    
    # Check if the file has .md extension
    if not file_path.endswith('.md'):
        return jsonify({
            'success': False,
            'error': 'Only .md files are supported'
        }), 400
    
    # Read the file content
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Use the relative path from PLAYBOOKS_DIR for the returned filename
        relative_path = os.path.relpath(file_path, PLAYBOOKS_DIR)
        
        return jsonify({
            'success': True,
            'filename': sanitized_filename,
            'path': relative_path,
            'content': content
        })
    except Exception as e:
        logger.error(f"Error loading playbook {file_path}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/playbooks/list/all', methods=['GET'])
def list_all_playbooks():
    """Get a list of all shared playbooks."""
    try:
        with playbook_lock:
            return jsonify({
                'success': True,
                'playbooks': playbooks
            })
    except Exception as e:
        logger.error(f"Error listing all playbooks: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/playbooks/sync/<filename>', methods=['POST'])
def sync_playbook(filename):
    """Update a shared playbook's content and notify all clients."""
    try:
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing content in request'
            }), 400
            
        sanitized_filename = os.path.basename(filename)
        
        # Get terminal ID from the request data (if provided)
        terminal_id = data.get('terminal_id', 'unknown')
        
        with playbook_lock:
            # Update or create the playbook entry
            playbooks[sanitized_filename] = {
                'filename': sanitized_filename,
                'content': data['content'],
                'last_modified': time.time(),
                'editor': data.get('editor', 'unknown'),
                'terminal_id': terminal_id  # Store the terminal ID
            }
            
        return jsonify({
            'success': True,
            'filename': sanitized_filename
        })
    except Exception as e:
        logger.error(f"Error syncing playbook {filename}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/playbooks/state/<filename>', methods=['GET'])
def get_playbook_state(filename):
    """Get the current state of a shared playbook."""
    try:
        sanitized_filename = os.path.basename(filename)
        
        with playbook_lock:
            if sanitized_filename in playbooks:
                return jsonify({
                    'success': True,
                    'playbook': playbooks[sanitized_filename]
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'Playbook {sanitized_filename} not found'
                }), 404
    except Exception as e:
        logger.error(f"Error getting playbook state for {filename}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/variables/sync/<terminal_id>', methods=['POST'])
def sync_variables(terminal_id):
    """Sync variables for a specific terminal."""
    # Sanitize terminal_id to prevent directory traversal
    sanitized_id = re.sub(r'[^a-zA-Z0-9\-_]', '', terminal_id)
    if sanitized_id != terminal_id:
        return jsonify({'success': False, 'error': 'Invalid terminal ID'}), 400
    
    try:
        # Get variables from request
        data = request.json
        if not data or not isinstance(data.get('variables'), dict):
            return jsonify({
                'success': False,
                'error': 'Missing or invalid variables data'
            }), 400
        
        # Store variables in server state
        with variables_lock:
            variables[sanitized_id] = data['variables']
        
        # Save variables to disk for persistence
        variables_dir = os.path.join(BASE_DIR, 'variables_data')
        os.makedirs(variables_dir, exist_ok=True)
        
        variables_file = os.path.join(variables_dir, f'variables_{sanitized_id}.json')
        with open(variables_file, 'w', encoding='utf-8') as f:
            json.dump(data['variables'], f)
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error syncing variables for {terminal_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/variables/load/<terminal_id>', methods=['GET'])
def load_variables(terminal_id):
    """Load variables for a specific terminal."""
    # Sanitize terminal_id to prevent directory traversal
    sanitized_id = re.sub(r'[^a-zA-Z0-9\-_]', '', terminal_id)
    if sanitized_id != terminal_id:
        return jsonify({'success': False, 'error': 'Invalid terminal ID'}), 400
    
    try:
        # Check if variables exist in memory
        with variables_lock:
            if sanitized_id in variables:
                return jsonify({
                    'success': True,
                    'variables': variables[sanitized_id]
                })
        
        # If not in memory, try to load from disk
        variables_dir = os.path.join(BASE_DIR, 'variables_data')
        variables_file = os.path.join(variables_dir, f'variables_{sanitized_id}.json')
        
        if os.path.exists(variables_file):
            with open(variables_file, 'r', encoding='utf-8') as f:
                loaded_variables = json.load(f)
                
                # Store in memory for future access
                with variables_lock:
                    variables[sanitized_id] = loaded_variables
                
                return jsonify({
                    'success': True,
                    'variables': loaded_variables
                })
        else:
            # No variables found, return empty object
            return jsonify({
                'success': True,
                'variables': {}
            })
    except Exception as e:
        logger.error(f"Error loading variables for {terminal_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/variables/list/all', methods=['GET'])
def list_all_variables():
    """List all saved variables."""
    try:
        variables_dir = os.path.join(BASE_DIR, 'variables_data')
        os.makedirs(variables_dir, exist_ok=True)
        
        # Get all variable files
        variable_files = glob.glob(os.path.join(variables_dir, 'variables_*.json'))
        
        result = {}
        for file_path in variable_files:
            try:
                # Extract terminal ID from filename
                file_name = os.path.basename(file_path)
                terminal_id = file_name.replace('variables_', '').replace('.json', '')
                
                # Load variables from file
                with open(file_path, 'r', encoding='utf-8') as f:
                    result[terminal_id] = json.load(f)
            except Exception as e:
                logger.error(f"Error reading variables file {file_path}: {e}")
                continue
        
        return jsonify({
            'success': True,
            'variables': result
        })
    except Exception as e:
        logger.error(f"Error listing variables: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Make terminal management functions available to Flask app
app.start_ttyd_process = start_ttyd_process
app.kill_terminal = kill_terminal

# Main entry point
if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        args = parse_arguments()
        logger.info(f"Starting CommandWave on port {args.port}")
        
        # Update hostname from command-line arguments
        HOSTNAME = args.hostname
        logger.info(f"Using hostname: {HOSTNAME}")
        
        # Set the hostname in Flask app config for template access
        app.config['HOSTNAME'] = HOSTNAME
        
        # Check if default terminal port is available, try alternative if needed
        initial_port = DEFAULT_TERMINAL_PORT
        if not is_port_available(initial_port):
            logger.warning(f"Default terminal port {initial_port} is already in use, finding an alternative")
            initial_port = find_available_port(TERMINAL_PORT_RANGE[0], TERMINAL_PORT_RANGE[1])
            if not initial_port:
                logger.error("Could not find an available port for the initial terminal")
                sys.exit(1)
            logger.info(f"Using alternative port {initial_port} for initial terminal")
        
        # Create initial terminal
        main_tmux_session = "commandwave-main"
        main_terminal_process = start_ttyd_process(
            initial_port, 
            main_tmux_session,
            args.use_default_tmux_config
        )
        
        if main_terminal_process:
            logger.info(f"Started main terminal on port {initial_port}")
            
            # Store information about this terminal
            with app.process_lock:
                app.terminals[initial_port] = {
                    'process': main_terminal_process,
                    'tmux_session': main_tmux_session,
                    'created_at': time.time(),
                    'name': 'Main Terminal'
                }
            
            # Set the default terminal port for the template
            app.config['DEFAULT_TERMINAL_PORT'] = initial_port
            
            # Start Flask app with SocketIO
            host = '0.0.0.0' if args.remote else '127.0.0.1'
            
            # Use socketio.run instead of app.run
            socketio.run(app, host=host, port=args.port, debug=False)
        else:
            logger.error("Failed to start initial terminal. Check if ttyd and tmux are installed.")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error starting application: {e}")
        cleanup_all_terminals()
