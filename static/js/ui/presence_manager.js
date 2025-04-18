/**
 * presence_manager.js
 * Manages user presence awareness and connected clients visualization
 */

import WebSocketHandler from '../sync/websocket_handler.js';
import NotificationManager from './notification_manager.js';

class PresenceManager {
    constructor() {
        // Connected clients information
        this.connectedClients = [];
        this.activeTerminalClients = [];
        
        // UI elements
        this.presenceContainerElement = null;
        this.createPresenceUI();
        
        // Resource lock states
        this.resourceLocks = {};
        
        // Initialize
        this.setupEventListeners();
    }
    
    /**
     * Initialize presence UI and event listeners
     */
    init() {
        console.log('Presence Manager initialized');
    }
    
    /**
     * Create the presence awareness UI
     */
    createPresenceUI() {
        // Create header container for presence indicator if it doesn't exist
        if (!document.querySelector('.presence-indicator')) {
            const headerControls = document.querySelector('.header-controls');
            
            if (headerControls) {
                // Create presence container
                this.presenceContainerElement = document.createElement('div');
                this.presenceContainerElement.className = 'presence-indicator';
                this.presenceContainerElement.innerHTML = `
                    <button class="presence-btn" title="Connected Users">
                        <i class="fas fa-users"></i> <span class="presence-count">0</span>
                    </button>
                    <div class="presence-dropdown">
                        <div class="presence-header">Connected Users</div>
                        <div class="presence-list"></div>
                    </div>
                `;
                
                // Insert before the settings button
                const settingsBtn = headerControls.querySelector('#settingsBtn');
                if (settingsBtn) {
                    headerControls.insertBefore(this.presenceContainerElement, settingsBtn);
                } else {
                    headerControls.appendChild(this.presenceContainerElement);
                }
                
                // Setup dropdown toggle
                const presenceBtn = this.presenceContainerElement.querySelector('.presence-btn');
                if (presenceBtn) {
                    presenceBtn.addEventListener('click', () => {
                        this.presenceContainerElement.classList.toggle('active');
                    });
                    
                    // Close dropdown when clicking outside
                    document.addEventListener('click', (event) => {
                        if (!this.presenceContainerElement.contains(event.target)) {
                            this.presenceContainerElement.classList.remove('active');
                        }
                    });
                }
            }
        } else {
            this.presenceContainerElement = document.querySelector('.presence-indicator');
        }
    }
    
    /**
     * Setup WebSocket event listeners for presence events
     */
    setupEventListeners() {
        // Listen for client updates
        WebSocketHandler.addEventListener('clients_updated', (data) => {
            this.handleClientsUpdated(data);
        });
        
        // Listen for terminal presence updates
        WebSocketHandler.addEventListener('terminal_presence_update', (data) => {
            this.handleTerminalPresenceUpdate(data);
        });
        
        // Listen for resource lock changes
        WebSocketHandler.addEventListener('resource_lock_changed', (data) => {
            this.handleResourceLockChanged(data);
        });
        
        // Listen for connection events
        WebSocketHandler.addEventListener('connection_established', (data) => {
            console.log('Connected to server with client ID:', data.client_id);
            
            // Join the current terminal room if active
            this.joinCurrentTerminal();
        });
        
        WebSocketHandler.addEventListener('connection_lost', (data) => {
            console.log('Connection to server lost:', data.reason);
            this.updatePresenceUI([]);
        });
        
        // Listen for tab changes to update presence
        document.addEventListener('terminal-tab-changed', (event) => {
            const terminalId = event.detail.port ? `terminal-${event.detail.port}` : null;
            this.setActiveTerminal(terminalId);
        });
    }
    
    /**
     * Handle updates to the list of connected clients
     * @param {Object} data - The clients update data
     */
    handleClientsUpdated(data) {
        this.connectedClients = data.clients || [];
        this.updatePresenceUI(this.connectedClients);
        
        // Show notification for new connections (if not the initial update)
        if (data.action === 'join' && data.client_id) {
            const client = this.connectedClients.find(c => c.id === data.client_id);
            if (client && client.id !== WebSocketHandler.getClientId()) {
                NotificationManager.showNotification(
                    `${client.username} connected`,
                    'info',
                    3000
                );
            }
        }
    }
    
    /**
     * Handle updates to the presence in a specific terminal
     * @param {Object} data - The terminal presence update data
     */
    handleTerminalPresenceUpdate(data) {
        this.activeTerminalClients = data.clients || [];
        
        // Update UI for terminal-specific presence
        this.updateTerminalPresenceUI();
        
        // Show notification for joins/leaves if this is the active terminal
        const activeTerminal = window.state?.activeTerminal;
        
        if (activeTerminal && data.terminal_id === activeTerminal && data.client_id !== WebSocketHandler.getClientId()) {
            const client = this.activeTerminalClients.find(c => c.id === data.client_id);
            const username = client?.username || data.username || 'Another user';
            
            if (data.action === 'join') {
                NotificationManager.showNotification(
                    `${username} joined this terminal`,
                    'info',
                    3000
                );
            } else if (data.action === 'leave') {
                NotificationManager.showNotification(
                    `${username} left this terminal`,
                    'info',
                    3000
                );
            }
        }
    }
    
    /**
     * Handle changes to resource locks
     * @param {Object} data - The resource lock change data
     */
    handleResourceLockChanged(data) {
        const resourceId = data.resource_id;
        
        if (!resourceId) return;
        
        if (data.locked) {
            // Resource is now locked
            this.resourceLocks[resourceId] = {
                client_id: data.client_id,
                username: data.username,
                timestamp: data.timestamp
            };
            
            // Update UI to show lock
            this.updateResourceLockUI(resourceId, true, data.username);
            
            // Show notification if someone else locked it
            if (data.client_id !== WebSocketHandler.getClientId()) {
                NotificationManager.showNotification(
                    `${data.username} is now editing ${this.getResourceDisplayName(resourceId)}`,
                    'warning',
                    5000
                );
            }
        } else {
            // Resource is now unlocked
            delete this.resourceLocks[resourceId];
            
            // Update UI to remove lock
            this.updateResourceLockUI(resourceId, false);
            
            // No notification for unlocks - less intrusive
        }
    }
    
    /**
     * Update the presence indicator UI with current client list
     * @param {Array} clients - List of connected clients
     */
    updatePresenceUI(clients) {
        if (!this.presenceContainerElement) return;
        
        // Update count
        const countElement = this.presenceContainerElement.querySelector('.presence-count');
        if (countElement) {
            countElement.textContent = clients.length;
        }
        
        // Update list
        const listElement = this.presenceContainerElement.querySelector('.presence-list');
        if (listElement) {
            // Current client ID
            const myClientId = WebSocketHandler.getClientId();
            
            // Generate list items
            listElement.innerHTML = clients.map(client => {
                const isCurrentUser = client.id === myClientId;
                const terminalName = client.active_terminal 
                    ? this.getTerminalName(client.active_terminal)
                    : 'No active terminal';
                
                return `
                    <div class="presence-item ${isCurrentUser ? 'current-user' : ''}">
                        <div class="presence-user">
                            <span class="presence-status"></span>
                            <span class="presence-name">${client.username}${isCurrentUser ? ' (You)' : ''}</span>
                        </div>
                        <div class="presence-location">
                            <span class="presence-terminal">${terminalName}</span>
                        </div>
                    </div>
                `;
            }).join('') || '<div class="presence-empty">No users connected</div>';
        }
    }
    
    /**
     * Update the UI for terminal-specific presence
     */
    updateTerminalPresenceUI() {
        // If we have active terminal tabs, update the tab buttons to show user count
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(tab => {
            const terminalId = tab.getAttribute('data-terminal-id');
            if (!terminalId) return;
            
            // Remove existing badge
            const existingBadge = tab.querySelector('.tab-presence-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Count how many users are in this terminal
            const clientsInTerminal = this.activeTerminalClients.filter(
                client => client.active_terminal === terminalId
            );
            
            // Only show badge if there are multiple users
            if (clientsInTerminal.length > 1) {
                const badge = document.createElement('span');
                badge.className = 'tab-presence-badge';
                badge.textContent = clientsInTerminal.length;
                badge.title = `${clientsInTerminal.length} users in this terminal`;
                tab.appendChild(badge);
            }
        });
    }
    
    /**
     * Update the UI for a resource lock
     * @param {string} resourceId - The resource ID
     * @param {boolean} isLocked - Whether the resource is locked
     * @param {string} username - The username of the user who locked it
     */
    updateResourceLockUI(resourceId, isLocked, username = '') {
        // Determine which UI element to update based on resource ID
        const resourceElement = this.getResourceElement(resourceId);
        if (!resourceElement) return;
        
        // Remove existing lock indicator
        const existingLock = resourceElement.querySelector('.resource-lock-indicator');
        if (existingLock) {
            existingLock.remove();
        }
        
        // Add new lock indicator if locked
        if (isLocked) {
            const lockIndicator = document.createElement('div');
            lockIndicator.className = 'resource-lock-indicator';
            lockIndicator.innerHTML = `
                <i class="fas fa-lock"></i>
                <span>Editing: ${username}</span>
            `;
            resourceElement.appendChild(lockIndicator);
            
            // Add locked class to parent
            resourceElement.classList.add('resource-locked');
            
            // Disable editing controls if it's not locked by current user
            if (this.resourceLocks[resourceId]?.client_id !== WebSocketHandler.getClientId()) {
                this.disableResourceEditing(resourceElement);
            }
        } else {
            // Remove locked class from parent
            resourceElement.classList.remove('resource-locked');
            
            // Re-enable editing controls
            this.enableResourceEditing(resourceElement);
        }
    }
    
    /**
     * Disable editing controls for a locked resource
     * @param {Element} resourceElement - The resource DOM element
     */
    disableResourceEditing(resourceElement) {
        // Notes editing
        const notesArea = resourceElement.querySelector('textarea');
        if (notesArea) {
            notesArea.setAttribute('disabled', true);
            notesArea.setAttribute('readonly', true);
        }
        
        // Disable edit buttons
        const editButtons = resourceElement.querySelectorAll('.edit-btn, .save-btn');
        editButtons.forEach(btn => {
            btn.setAttribute('disabled', true);
            btn.classList.add('disabled');
        });
    }
    
    /**
     * Enable editing controls for an unlocked resource
     * @param {Element} resourceElement - The resource DOM element
     */
    enableResourceEditing(resourceElement) {
        // Notes editing
        const notesArea = resourceElement.querySelector('textarea');
        if (notesArea) {
            notesArea.removeAttribute('disabled');
            notesArea.removeAttribute('readonly');
        }
        
        // Enable edit buttons
        const editButtons = resourceElement.querySelectorAll('.edit-btn, .save-btn');
        editButtons.forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
        });
    }
    
    /**
     * Get the DOM element for a resource based on its ID
     * @param {string} resourceId - The resource ID
     * @returns {Element} - The DOM element for the resource
     */
    getResourceElement(resourceId) {
        if (!resourceId) return null;
        
        // Resource ID format: "type:id"
        const [type, id] = resourceId.split(':');
        
        switch (type) {
            case 'notes':
                if (id === 'global') {
                    return document.querySelector('.global-notes-container');
                } else {
                    return document.querySelector(`.tab-notes-container[data-terminal-id="${id}"]`);
                }
            case 'playbook':
                return document.querySelector(`.playbook-item[data-playbook-name="${id}"]`);
            default:
                return null;
        }
    }
    
    /**
     * Get a display name for a resource based on its ID
     * @param {string} resourceId - The resource ID
     * @returns {string} - A human-readable name for the resource
     */
    getResourceDisplayName(resourceId) {
        if (!resourceId) return 'Unknown Resource';
        
        // Resource ID format: "type:id"
        const [type, id] = resourceId.split(':');
        
        switch (type) {
            case 'notes':
                return id === 'global' ? 'Global Notes' : 'Terminal Notes';
            case 'playbook':
                return `Playbook: ${id}`;
            default:
                return 'Resource';
        }
    }
    
    /**
     * Get the name of a terminal based on its ID
     * @param {string} terminalId - The terminal ID
     * @returns {string} - The terminal name
     */
    getTerminalName(terminalId) {
        // Try to get terminal name from state
        if (window.state?.terminals && window.state.terminals[terminalId]) {
            return window.state.terminals[terminalId].name || `Terminal ${terminalId}`;
        }
        
        // Try to get from DOM
        const tabElement = document.querySelector(`.tab-btn[data-terminal-id="${terminalId}"]`);
        if (tabElement) {
            return tabElement.textContent.trim();
        }
        
        return `Terminal ${terminalId}`;
    }
    
    /**
     * Set the active terminal and join its WebSocket room
     * @param {string} terminalId - The terminal ID
     */
    setActiveTerminal(terminalId) {
        if (terminalId) {
            WebSocketHandler.joinTerminal(terminalId);
        }
    }
    
    /**
     * Join the current active terminal WebSocket room
     */
    joinCurrentTerminal() {
        const activeTerminal = window.state?.activeTerminal;
        if (activeTerminal) {
            this.setActiveTerminal(activeTerminal);
        }
    }
    
    /**
     * Request an editing lock for a resource
     * @param {string} resourceId - The resource ID
     * @returns {Promise<boolean>} - Promise resolving to whether the lock was acquired
     */
    async requestEditingLock(resourceId) {
        // Check if already locked by someone else
        if (this.resourceLocks[resourceId] && 
            this.resourceLocks[resourceId].client_id !== WebSocketHandler.getClientId()) {
            
            NotificationManager.showNotification(
                `Cannot edit - ${this.getResourceDisplayName(resourceId)} is currently being edited by ${this.resourceLocks[resourceId].username}`,
                'error',
                3000
            );
            return false;
        }
        
        // Request lock from server
        const acquired = await WebSocketHandler.notifyEditingStarted(resourceId);
        
        if (!acquired) {
            NotificationManager.showNotification(
                `Could not acquire editing lock for ${this.getResourceDisplayName(resourceId)}`,
                'error',
                3000
            );
        }
        
        return acquired;
    }
    
    /**
     * Release an editing lock for a resource
     * @param {string} resourceId - The resource ID
     */
    releaseEditingLock(resourceId) {
        // Only release if we own the lock
        if (!this.resourceLocks[resourceId] || 
            this.resourceLocks[resourceId].client_id !== WebSocketHandler.getClientId()) {
            return;
        }
        
        WebSocketHandler.notifyEditingStopped(resourceId);
    }
}

// Export the class
export default PresenceManager;
