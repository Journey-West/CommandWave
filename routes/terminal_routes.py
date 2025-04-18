"""
routes/terminal_routes.py
Flask Blueprint for terminal-related API endpoints.
"""

from flask import Blueprint, request, jsonify
import subprocess
import os
import logging

# Configure logging
logger = logging.getLogger('commandwave')

# Create blueprint
terminal_routes = Blueprint('terminal_routes', __name__, url_prefix='/api/terminals')

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
        
        # Instead of trying to import from main directly, we'll access 
        # terminal information via the Flask app config
        from flask import current_app
        
        # Convert port to int for dictionary lookup
        port_int = int(port)
        
        terminal_info = None
        # Access the terminals dictionary safely through the app context
        if hasattr(current_app, 'terminals') and port_int in current_app.terminals:
            terminal_info = current_app.terminals[port_int]
        
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
