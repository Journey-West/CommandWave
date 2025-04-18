"""
routes/terminal_routes.py
Flask Blueprint for terminal-related API endpoints.
"""

from flask import Blueprint, request, jsonify, current_app
import subprocess
import os
import logging
import time
import socket

# Configure logging
logger = logging.getLogger('commandwave')

# Create blueprint
terminal_routes = Blueprint('terminal_routes', __name__, url_prefix='/api/terminals')

@terminal_routes.route('/new', methods=['POST'])
def create_terminal():
    """Create a new terminal session and return its port."""
    try:
        # Get terminal name from request
        data = request.get_json()
        tab_name = data.get('name', 'Terminal')
        
        # Access app's terminals dictionary and process_lock
        app = current_app
        
        if not hasattr(app, 'terminals') or not hasattr(app, 'process_lock'):
            logger.error("App missing required terminal management attributes")
            logger.error(f"Available attributes: {dir(app)}")
            return jsonify({'success': False, 'error': 'Terminal management not available'}), 500
            
        # Find an available port - similar to the main app's find_available_port
        start_port = 7682
        end_port = 7781
        
        port = None
        for test_port in range(start_port, end_port + 1):
            # Check if port is in use
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                in_use = s.connect_ex(('127.0.0.1', test_port)) == 0
                
            if not in_use and test_port not in app.terminals:
                port = test_port
                break
                
        if not port:
            logger.error("Could not find available port for new terminal")
            return jsonify({
                'success': False,
                'error': 'No available ports'
            }), 500
            
        # Create new tmux session name
        tmux_session = f"commandwave-{port}"
            
        # Call the app's ttyd process starter function
        if hasattr(app, 'start_ttyd_process'):
            logger.error(f"Available attributes on app object: {dir(app)}")
            # Use default tmux config
            use_tmux_config = True
            terminal_process = app.start_ttyd_process(port, tmux_session, use_tmux_config)
            
            if terminal_process:
                # Store information about this terminal
                with app.process_lock:
                    app.terminals[port] = {
                        'process': terminal_process,
                        'tmux_session': tmux_session,
                        'created_at': time.time(),
                        'name': tab_name
                    }
                    
                logger.info(f"Created new terminal on port {port} with name '{tab_name}'")
                return jsonify({
                    'success': True,
                    'port': port,
                    'name': tab_name
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to create terminal process'
                }), 500
        else:
            logger.error("App missing start_ttyd_process function")
            logger.error(f"Available attributes on app object: {dir(app)}")
            return jsonify({'success': False, 'error': 'Terminal creation not supported'}), 500
    except Exception as e:
        logger.error(f"Error creating new terminal: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@terminal_routes.route('/rename/<int:port>', methods=['POST'])
def rename_terminal(port):
    """Rename a terminal session."""
    try:
        # Check if the terminal exists
        app = current_app
        if not hasattr(app, 'terminals') or port not in app.terminals:
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

@terminal_routes.route('/delete/<int:port>', methods=['POST'])
def delete_terminal_post(port):
    """Terminate a terminal session (POST endpoint)."""
    return delete_terminal(port)

@terminal_routes.route('/<int:port>', methods=['DELETE'])
def delete_terminal(port):
    """Terminate a terminal session."""
    try:
        # Check if the terminal exists
        app = current_app
        if not hasattr(app, 'terminals') or port not in app.terminals:
            return jsonify({
                'success': False,
                'error': 'Terminal not found'
            }), 404
            
        # Access the kill_terminal function
        if hasattr(app, 'kill_terminal'):
            # Kill the terminal
            if app.kill_terminal(port):
                logger.info(f"Deleted terminal on port {port}")
                return jsonify({
                    'success': True
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'Failed to delete terminal on port {port}'
                }), 500
        else:
            logger.error("App missing kill_terminal function")
            logger.error(f"Available attributes on app object: {dir(app)}")
            return jsonify({
                'success': False,
                'error': 'Terminal deletion not supported'
            }), 500
    except Exception as e:
        logger.error(f"Error deleting terminal on port {port}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@terminal_routes.route('/list', methods=['GET'])
def list_terminals():
    """Get a list of all active terminals."""
    app = current_app
    if not hasattr(app, 'terminals') or not hasattr(app, 'process_lock'):
        return jsonify({
            'success': True,
            'terminals': []
        })
    
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

@terminal_routes.route('/send-command', methods=['POST'])
def send_command():
    """Send a command to a terminal."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        port = data.get('port')
        command = data.get('command')
        
        if not port:
            return jsonify({'success': False, 'error': 'No port specified'}), 400
        
        if not command:
            return jsonify({'success': False, 'error': 'No command specified'}), 400
        
        logger.info(f"Sending command to terminal {port}: {command}")
        
        # Convert port to int for dictionary lookup
        port_int = int(port)
        
        terminal_info = None
        # Access the terminals dictionary safely through the app context
        app = current_app
        if hasattr(app, 'terminals') and port_int in app.terminals:
            terminal_info = app.terminals[port_int]
        
        if not terminal_info or 'tmux_session' not in terminal_info:
            logger.error(f"No terminal information found for port {port}")
            return jsonify({
                'success': False,
                'error': f'No tmux session found for terminal {port}'
            }), 404
            
        tmux_session = terminal_info['tmux_session']
        
        # Use tmux to send the command to the correct terminal
        # Escape single quotes in the command to prevent shell injection
        safe_command = command.replace("'", "'\\''")
        tmux_command = f"tmux send-keys -t {tmux_session} '{safe_command}' Enter"
        
        # Execute the tmux command
        result = subprocess.run(tmux_command, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Error sending command: {result.stderr}")
            return jsonify({
                'success': False, 
                'error': f'Failed to send command: {result.stderr}'
            }), 500
        
        return jsonify({
            'success': True,
            'message': f'Command sent to terminal {port}'
        })
        
    except Exception as e:
        logger.exception(f"Error sending command: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
