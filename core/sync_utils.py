"""
core/sync_utils.py
Core utilities for handling real-time synchronization between clients.
"""

import logging
import json
from typing import Dict, Set, Optional, Any, List
from flask_socketio import SocketIO, emit, join_room, leave_room

# Configure logging
logger = logging.getLogger('commandwave')

# Connected clients tracking
class ClientTracker:
    """Tracks connected clients and their active terminal tabs."""
    
    def __init__(self):
        # Main registry of connected clients: client_id -> client_info
        self.clients: Dict[str, Dict[str, Any]] = {}
        
        # Terminal room tracking: terminal_id -> set(client_ids)
        self.terminal_rooms: Dict[str, Set[str]] = {}
        
        # Editing locks: resource_id -> {client_id, username, timestamp}
        self.editing_locks: Dict[str, Dict[str, Any]] = {}
    
    def add_client(self, client_id: str, username: str = "Anonymous") -> None:
        """Add a new client connection."""
        if client_id not in self.clients:
            self.clients[client_id] = {
                'id': client_id,
                'username': username,
                'active_terminal': None,
                'connected_at': __import__('time').time()
            }
            logger.info(f"Client {client_id} ({username}) connected")
    
    def remove_client(self, client_id: str) -> None:
        """Remove a client connection and clean up rooms."""
        if client_id in self.clients:
            # Get current terminal to clean up room
            current_terminal = self.clients[client_id].get('active_terminal')
            if current_terminal and current_terminal in self.terminal_rooms:
                self.terminal_rooms[current_terminal].discard(client_id)
                # Clean up empty rooms
                if not self.terminal_rooms[current_terminal]:
                    del self.terminal_rooms[current_terminal]
            
            # Remove client from tracker
            username = self.clients[client_id].get('username', 'Anonymous')
            del self.clients[client_id]
            logger.info(f"Client {client_id} ({username}) disconnected")
            
            # Release any editing locks held by this client
            self._release_client_locks(client_id)
    
    def update_client_terminal(self, client_id: str, terminal_id: str) -> None:
        """Update the active terminal for a client."""
        if client_id not in self.clients:
            logger.warning(f"Attempt to update unknown client {client_id}")
            return
        
        # Leave the current terminal room if any
        current_terminal = self.clients[client_id].get('active_terminal')
        if current_terminal and current_terminal in self.terminal_rooms:
            self.terminal_rooms[current_terminal].discard(client_id)
            # Clean up empty rooms
            if not self.terminal_rooms[current_terminal] and current_terminal in self.terminal_rooms:
                del self.terminal_rooms[current_terminal]
        
        # Update client's active terminal
        self.clients[client_id]['active_terminal'] = terminal_id
        
        # Join the new terminal room
        if terminal_id:
            if terminal_id not in self.terminal_rooms:
                self.terminal_rooms[terminal_id] = set()
            self.terminal_rooms[terminal_id].add(client_id)
            
        logger.debug(f"Client {client_id} now active in terminal {terminal_id}")
    
    def get_terminal_clients(self, terminal_id: str) -> List[Dict[str, Any]]:
        """Get all clients in a terminal room."""
        if terminal_id not in self.terminal_rooms:
            return []
        
        return [
            self.clients[client_id] 
            for client_id in self.terminal_rooms[terminal_id]
            if client_id in self.clients
        ]
    
    def acquire_editing_lock(self, resource_id: str, client_id: str) -> bool:
        """
        Attempt to acquire an editing lock for a resource.
        Returns True if successful, False if the resource is already locked.
        """
        # Check if resource is already locked by someone else
        if (resource_id in self.editing_locks and 
            self.editing_locks[resource_id]['client_id'] != client_id):
            return False
        
        # Acquire or refresh the lock
        if client_id in self.clients:
            self.editing_locks[resource_id] = {
                'client_id': client_id,
                'username': self.clients[client_id].get('username', 'Anonymous'),
                'timestamp': __import__('time').time()
            }
            return True
        
        return False
    
    def release_editing_lock(self, resource_id: str, client_id: str) -> bool:
        """
        Release an editing lock if it's held by the specified client.
        Returns True if successful, False if not found or not owned by client.
        """
        if (resource_id in self.editing_locks and 
            self.editing_locks[resource_id]['client_id'] == client_id):
            del self.editing_locks[resource_id]
            return True
        return False
    
    def _release_client_locks(self, client_id: str) -> None:
        """Release all editing locks held by a client."""
        resources_to_release = [
            resource_id for resource_id, lock_info in self.editing_locks.items()
            if lock_info['client_id'] == client_id
        ]
        
        for resource_id in resources_to_release:
            del self.editing_locks[resource_id]
            logger.debug(f"Released lock on {resource_id} for disconnected client {client_id}")
    
    def get_all_clients(self) -> List[Dict[str, Any]]:
        """Get a list of all connected clients."""
        return list(self.clients.values())
    
    def get_lock_info(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Get lock information for a resource if it exists."""
        return self.editing_locks.get(resource_id)


# Create singleton instance
client_tracker = ClientTracker()

# Real-time event broadcasting
def broadcast_to_terminal(terminal_id: str, event_name: str, data: Dict[str, Any], include_sender: bool = False) -> None:
    """
    Broadcast an event to all clients in a terminal room.
    
    Args:
        terminal_id: The terminal room ID to broadcast to
        event_name: The name of the event to emit
        data: The data payload for the event
        include_sender: Whether to include the sender in the broadcast
    """
    from flask import request
    
    if not terminal_id:
        logger.warning(f"Attempted to broadcast to invalid terminal ID: {terminal_id}")
        return
    
    # Get the socketio instance
    socketio = get_socketio()
    if not socketio:
        logger.error("Failed to get SocketIO instance for broadcasting")
        return
    
    # Add sender information to the data
    sender_id = request.sid if hasattr(request, 'sid') else None
    if sender_id:
        data['sender_id'] = sender_id
    
    # Emit to the terminal room
    room = f"terminal_{terminal_id}"
    to = None if include_sender else request.sid
    socketio.emit(event_name, data, room=room, skip_sid=to)
    logger.debug(f"Broadcast {event_name} to terminal {terminal_id}")


def broadcast_global(event_name: str, data: Dict[str, Any], include_sender: bool = False) -> None:
    """
    Broadcast an event to all connected clients.
    
    Args:
        event_name: The name of the event to emit
        data: The data payload for the event
        include_sender: Whether to include the sender in the broadcast
    """
    from flask import request
    
    # Get the socketio instance
    socketio = get_socketio()
    if not socketio:
        logger.error("Failed to get SocketIO instance for broadcasting")
        return
    
    # Add sender information to the data
    sender_id = request.sid if hasattr(request, 'sid') else None
    if sender_id:
        data['sender_id'] = sender_id
    
    # Emit to all clients
    to = None if include_sender else request.sid
    socketio.emit(event_name, data, skip_sid=to)
    logger.debug(f"Broadcast {event_name} globally")


# SocketIO singleton management
_socketio_instance = None

def init_socketio(app) -> SocketIO:
    """Initialize the SocketIO instance for the application."""
    global _socketio_instance
    
    if _socketio_instance is None:
        # Create SocketIO instance with cors_allowed_origins set to allow connections
        _socketio_instance = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)
        logger.info("SocketIO initialized")
    
    return _socketio_instance

def get_socketio() -> Optional[SocketIO]:
    """Get the current SocketIO instance."""
    return _socketio_instance
