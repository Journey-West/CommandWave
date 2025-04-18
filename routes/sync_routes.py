"""
routes/sync_routes.py
WebSocket event handlers for real-time synchronization.
"""

import logging
import json
import time
from typing import Dict, Any, Optional
from flask import Blueprint, request, session
from flask_socketio import emit, join_room, leave_room, disconnect

from core.sync_utils import client_tracker, broadcast_to_terminal, broadcast_global

# Configure logging
logger = logging.getLogger('commandwave')

# Create blueprint - note: this is for HTTP routes, SocketIO events are registered separately
sync_routes = Blueprint('sync_routes', __name__, url_prefix='/api/sync')

# Event handlers will be registered by the init_socketio_events function

def init_socketio_events(socketio):
    """Initialize all SocketIO event handlers."""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle new client connections."""
        client_id = request.sid
        # Get username from query params or session
        username = request.args.get('username', 'Anonymous User')
        
        # Add client to tracker
        client_tracker.add_client(client_id, username)
        
        # Broadcast updated client list to all clients
        broadcast_global('clients_updated', {
            'clients': client_tracker.get_all_clients(),
            'count': len(client_tracker.clients)
        }, include_sender=True)
        
        logger.info(f"Client connected: {client_id} ({username})")
        
        # Respond with initialization data
        emit('connection_established', {
            'client_id': client_id,
            'username': username,
            'timestamp': time.time(),
            'client_count': len(client_tracker.clients)
        })

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnections."""
        client_id = request.sid
        
        # Get client info before removal
        client_info = client_tracker.clients.get(client_id, {})
        terminal_id = client_info.get('active_terminal')
        
        # Remove client from tracker
        client_tracker.remove_client(client_id)
        
        # If client was in a terminal, notify other clients in that terminal
        if terminal_id:
            broadcast_to_terminal(terminal_id, 'terminal_presence_update', {
                'clients': client_tracker.get_terminal_clients(terminal_id),
                'action': 'leave',
                'client_id': client_id,
                'timestamp': time.time()
            }, include_sender=True)
        
        # Broadcast updated client list to all clients
        broadcast_global('clients_updated', {
            'clients': client_tracker.get_all_clients(),
            'count': len(client_tracker.clients)
        }, include_sender=True)
        
        logger.info(f"Client disconnected: {client_id}")
    
    @socketio.on('join_terminal')
    def handle_join_terminal(data):
        """Handle a client joining a terminal tab."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        
        if not terminal_id:
            logger.warning(f"Invalid terminal ID in join request from {client_id}")
            return
        
        # Update client's active terminal
        client_tracker.update_client_terminal(client_id, terminal_id)
        
        # Join the socket.io room for this terminal
        room_name = f"terminal_{terminal_id}"
        join_room(room_name)
        
        # Get client info
        client_info = client_tracker.clients.get(client_id, {})
        username = client_info.get('username', 'Anonymous')
        
        # Notify other clients in this terminal
        clients_in_terminal = client_tracker.get_terminal_clients(terminal_id)
        broadcast_to_terminal(terminal_id, 'terminal_presence_update', {
            'clients': clients_in_terminal,
            'action': 'join',
            'client_id': client_id,
            'username': username,
            'timestamp': time.time()
        })
        
        logger.info(f"Client {client_id} ({username}) joined terminal {terminal_id}")
        
        # Respond with success and terminal clients
        emit('join_terminal_success', {
            'terminal_id': terminal_id,
            'clients': clients_in_terminal
        })
    
    @socketio.on('leave_terminal')
    def handle_leave_terminal(data):
        """Handle a client leaving a terminal tab."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        
        if not terminal_id:
            logger.warning(f"Invalid terminal ID in leave request from {client_id}")
            return
        
        # Get client info before update
        client_info = client_tracker.clients.get(client_id, {})
        current_terminal = client_info.get('active_terminal')
        
        # Only process if client is actually in this terminal
        if current_terminal != terminal_id:
            return
        
        # Leave the socket.io room for this terminal
        room_name = f"terminal_{terminal_id}"
        leave_room(room_name)
        
        # Update client tracker (set to None)
        client_tracker.update_client_terminal(client_id, None)
        
        # Notify other clients in this terminal
        broadcast_to_terminal(terminal_id, 'terminal_presence_update', {
            'clients': client_tracker.get_terminal_clients(terminal_id),
            'action': 'leave',
            'client_id': client_id,
            'username': client_info.get('username', 'Anonymous'),
            'timestamp': time.time()
        })
        
        logger.info(f"Client {client_id} left terminal {terminal_id}")
    
    @socketio.on('terminal_created')
    def handle_terminal_created(data):
        """Handle notification that a new terminal was created."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        terminal_name = data.get('name', 'New Terminal')
        port = data.get('port')
        
        if not terminal_id or not port:
            logger.warning(f"Invalid terminal data in creation notification from {client_id}")
            return
        
        # Broadcast to all clients
        broadcast_global('terminal_created', {
            'terminal_id': terminal_id,
            'name': terminal_name,
            'port': port,
            'timestamp': time.time()
        })
        
        logger.info(f"Terminal created broadcast: {terminal_id} ({terminal_name})")
    
    @socketio.on('terminal_renamed')
    def handle_terminal_renamed(data):
        """Handle notification that a terminal was renamed."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        new_name = data.get('name')
        
        if not terminal_id or not new_name:
            logger.warning(f"Invalid terminal data in rename notification from {client_id}")
            return
        
        # Broadcast to all clients
        broadcast_global('terminal_renamed', {
            'terminal_id': terminal_id,
            'name': new_name,
            'timestamp': time.time()
        })
        
        logger.info(f"Terminal renamed broadcast: {terminal_id} to {new_name}")
    
    @socketio.on('terminal_closed')
    def handle_terminal_closed(data):
        """Handle notification that a terminal was closed."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        
        if not terminal_id:
            logger.warning(f"Invalid terminal ID in close notification from {client_id}")
            return
        
        # Broadcast to all clients
        broadcast_global('terminal_closed', {
            'terminal_id': terminal_id,
            'timestamp': time.time()
        })
        
        logger.info(f"Terminal closed broadcast: {terminal_id}")
    
    @socketio.on('variable_updated')
    def handle_variable_updated(data):
        """Handle notification that a variable was updated."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        variable_name = data.get('name')
        variable_value = data.get('value')
        action = data.get('action', 'update')  # create, update, delete
        
        if not terminal_id or not variable_name:
            logger.warning(f"Invalid variable data from {client_id}")
            return
        
        # Broadcast to clients in the same terminal
        broadcast_to_terminal(terminal_id, 'variable_changed', {
            'terminal_id': terminal_id,
            'name': variable_name,
            'value': variable_value,
            'action': action,
            'timestamp': time.time()
        })
        
        logger.info(f"Variable {action} broadcast: {terminal_id} - {variable_name}")
    
    @socketio.on('playbook_updated')
    def handle_playbook_updated(data):
        """Handle notification that a playbook was updated."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')
        playbook_name = data.get('name')
        action = data.get('action', 'update')  # load, update, close
        
        if not terminal_id or not playbook_name:
            logger.warning(f"Invalid playbook data from {client_id}")
            return
        
        # Broadcast to clients in the same terminal
        broadcast_to_terminal(terminal_id, 'playbook_changed', {
            'terminal_id': terminal_id,
            'name': playbook_name,
            'action': action,
            'timestamp': time.time()
        })
        
        logger.info(f"Playbook {action} broadcast: {terminal_id} - {playbook_name}")
    
    @socketio.on('notes_updated')
    def handle_notes_updated(data):
        """Handle notification that notes were updated."""
        client_id = request.sid
        terminal_id = data.get('terminal_id')  # None for global notes
        content = data.get('content', '')
        
        if terminal_id:
            # Terminal-specific notes - broadcast to clients in that terminal
            broadcast_to_terminal(terminal_id, 'notes_changed', {
                'terminal_id': terminal_id,
                'content': content,
                'timestamp': time.time()
            })
            logger.info(f"Terminal notes update broadcast: {terminal_id}")
        else:
            # Global notes - broadcast to all clients
            broadcast_global('global_notes_changed', {
                'content': content,
                'timestamp': time.time()
            })
            logger.info("Global notes update broadcast")
    
    @socketio.on('editing_started')
    def handle_editing_started(data):
        """Handle notification that a client started editing a resource."""
        client_id = request.sid
        resource_id = data.get('resource_id')  # Format: "notes:global" or "notes:terminal_123" or "playbook:name.md"
        
        if not resource_id:
            logger.warning(f"Invalid resource ID in editing notification from {client_id}")
            return
        
        # Try to acquire lock
        success = client_tracker.acquire_editing_lock(resource_id, client_id)
        
        if success:
            # Get client info
            client_info = client_tracker.clients.get(client_id, {})
            username = client_info.get('username', 'Anonymous')
            
            # Determine if this is a terminal-specific resource
            is_terminal_resource = 'terminal_' in resource_id
            terminal_id = None
            
            if is_terminal_resource:
                # Extract terminal ID from resource ID
                parts = resource_id.split('terminal_')
                if len(parts) > 1:
                    terminal_id = 'terminal_' + parts[1].split(':')[0]
            
            # Broadcast based on resource scope
            if terminal_id:
                broadcast_to_terminal(terminal_id, 'resource_lock_changed', {
                    'resource_id': resource_id,
                    'locked': True,
                    'client_id': client_id,
                    'username': username,
                    'timestamp': time.time()
                })
            else:
                broadcast_global('resource_lock_changed', {
                    'resource_id': resource_id,
                    'locked': True,
                    'client_id': client_id,
                    'username': username,
                    'timestamp': time.time()
                })
            
            logger.info(f"Editing lock acquired: {resource_id} by {client_id} ({username})")
            
            # Respond with success
            emit('editing_lock_response', {
                'resource_id': resource_id,
                'success': True
            })
        else:
            # Get info about who holds the lock
            lock_info = client_tracker.get_lock_info(resource_id)
            
            # Respond with failure
            emit('editing_lock_response', {
                'resource_id': resource_id,
                'success': False,
                'lock_info': lock_info
            })
            
            logger.info(f"Editing lock denied: {resource_id} for {client_id}, already held by {lock_info['client_id'] if lock_info else 'unknown'}")
    
    @socketio.on('editing_stopped')
    def handle_editing_stopped(data):
        """Handle notification that a client stopped editing a resource."""
        client_id = request.sid
        resource_id = data.get('resource_id')
        
        if not resource_id:
            logger.warning(f"Invalid resource ID in editing stop notification from {client_id}")
            return
        
        # Release lock
        success = client_tracker.release_editing_lock(resource_id, client_id)
        
        if success:
            # Determine if this is a terminal-specific resource
            is_terminal_resource = 'terminal_' in resource_id
            terminal_id = None
            
            if is_terminal_resource:
                # Extract terminal ID from resource ID
                parts = resource_id.split('terminal_')
                if len(parts) > 1:
                    terminal_id = 'terminal_' + parts[1].split(':')[0]
            
            # Broadcast based on resource scope
            if terminal_id:
                broadcast_to_terminal(terminal_id, 'resource_lock_changed', {
                    'resource_id': resource_id,
                    'locked': False,
                    'timestamp': time.time()
                })
            else:
                broadcast_global('resource_lock_changed', {
                    'resource_id': resource_id,
                    'locked': False,
                    'timestamp': time.time()
                })
            
            logger.info(f"Editing lock released: {resource_id} by {client_id}")
        
        # Always send a success response even if the lock wasn't found
        # (it might have timed out or been released by the system)
        emit('editing_unlock_response', {
            'resource_id': resource_id,
            'success': True
        })

    logger.info("Initialized SocketIO event handlers")

# HTTP route to get current connected clients
@sync_routes.route('/clients', methods=['GET'])
def get_clients():
    """Get a list of all connected clients."""
    return {
        'success': True,
        'clients': client_tracker.get_all_clients(),
        'count': len(client_tracker.clients)
    }

# HTTP route to get clients in a specific terminal
@sync_routes.route('/terminals/<terminal_id>/clients', methods=['GET'])
def get_terminal_clients(terminal_id):
    """Get a list of clients in a specific terminal."""
    return {
        'success': True,
        'terminal_id': terminal_id,
        'clients': client_tracker.get_terminal_clients(terminal_id),
        'count': len(client_tracker.get_terminal_clients(terminal_id))
    }
