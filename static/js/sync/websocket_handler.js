/**
 * websocket_handler.js
 * Handles WebSocket connections and event dispatching for real-time sync
 */

class WebSocketHandler {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.clientId = null;
        this.username = 'Anonymous User';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        this.lastServerContactTime = null;
        this.eventListeners = {};
        
        // Get the hostname from DOM if available
        const hostnameElement = document.getElementById('hostname');
        this.hostname = hostnameElement && hostnameElement.value 
            ? hostnameElement.value 
            : window.location.hostname;
        
        // Get API base URL from the hidden element or fallback to window.location
        const apiBaseUrlElem = document.getElementById('api-base-url');
        this.apiBaseUrl = apiBaseUrlElem && apiBaseUrlElem.dataset.url 
            ? apiBaseUrlElem.dataset.url 
            : window.location.origin + '/';
    }

    /**
     * Initialize the WebSocket connection
     * @param {string} username - Username for this client
     */
    init(username = 'Anonymous User') {
        this.username = username;
        this.connect();
        this.startKeepAlive();
        
        // Register global error handler for socket errors
        window.addEventListener('offline', () => {
            console.warn('Browser went offline, WebSocket connection may be interrupted');
        });
        
        window.addEventListener('online', () => {
            console.log('Browser back online, attempting to reconnect WebSocket');
            if (!this.connected) {
                this.reconnect();
            }
        });
        
        console.log('WebSocket handler initialized');
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        try {
            // Close existing socket if any
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
            
            // Load socket.io from CDN if not already available
            if (!window.io) {
                console.error('Socket.io client not loaded - please add the CDN script to the page');
                return;
            }
            
            // Determine WebSocket URL - use secure connection if page is secure
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${window.location.protocol}//${this.hostname}:${window.location.port}`;
            
            console.log(`Connecting to WebSocket at ${wsUrl}`);
            
            // Connect to the server
            this.socket = io(wsUrl, {
                query: {
                    username: this.username
                },
                transports: ['websocket', 'polling'],
                reconnection: false // We'll handle reconnection ourselves
            });
            
            // Set up event handlers
            this.setupSocketHandlers();
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            this.handleConnectionError();
        }
    }

    /**
     * Set up socket.io event handlers
     */
    setupSocketHandlers() {
        if (!this.socket) return;
        
        // Connection established
        this.socket.on('connect', () => {
            console.log('WebSocket connected successfully');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 2000;
            this.clientId = this.socket.id;
            this.lastServerContactTime = Date.now();
            
            // Dispatch connection event
            this.dispatchEvent('connection_established', {
                clientId: this.clientId,
                username: this.username
            });
        });
        
        // Connection response with client data
        this.socket.on('connection_established', (data) => {
            console.log('Connection acknowledged by server:', data);
            this.clientId = data.client_id;
            
            // Dispatch connection event with server data
            this.dispatchEvent('connection_established', data);
        });
        
        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError();
        });
        
        // Disconnected
        this.socket.on('disconnect', (reason) => {
            console.log(`WebSocket disconnected: ${reason}`);
            this.connected = false;
            
            // Dispatch disconnect event
            this.dispatchEvent('connection_lost', { reason });
            
            // Attempt to reconnect unless closed intentionally
            if (reason !== 'io client disconnect') {
                this.reconnect();
            }
        });
        
        // Terminal events
        this.socket.on('terminal_created', (data) => {
            this.dispatchEvent('terminal_created', data);
        });
        
        this.socket.on('terminal_renamed', (data) => {
            this.dispatchEvent('terminal_renamed', data);
        });
        
        this.socket.on('terminal_closed', (data) => {
            this.dispatchEvent('terminal_closed', data);
        });
        
        this.socket.on('terminal_presence_update', (data) => {
            this.dispatchEvent('terminal_presence_update', data);
        });
        
        // Synchronization events: remote variable updates
        this.socket.on('remote_variable_update', (data) => {
            this.dispatchEvent('remote_variable_update', data);
        });
        
        // Playbook events
        this.socket.on('playbook_changed', (data) => {
            this.dispatchEvent('playbook_changed', data);
        });
        
        // Notes events
        this.socket.on('notes_changed', (data) => {
            this.dispatchEvent('notes_changed', data);
        });
        
        this.socket.on('global_notes_changed', (data) => {
            this.dispatchEvent('global_notes_changed', data);
        });
        
        // Resource editing lock events
        this.socket.on('resource_lock_changed', (data) => {
            this.dispatchEvent('resource_lock_changed', data);
        });
        
        this.socket.on('editing_lock_response', (data) => {
            this.dispatchEvent('editing_lock_response', data);
        });
        
        this.socket.on('editing_unlock_response', (data) => {
            this.dispatchEvent('editing_unlock_response', data);
        });
        
        // Client presence events
        this.socket.on('clients_updated', (data) => {
            this.dispatchEvent('clients_updated', data);
        });
        
        // Keep-alive ping response
        this.socket.on('server_pong', (data) => {
            console.log('Received server_pong:', data);
            this.lastServerContactTime = Date.now();
            this.dispatchEvent('server_pong', data);
        });
    }

    /**
     * Handle connection errors with exponential backoff for reconnection
     */
    handleConnectionError() {
        this.connected = false;
        this.reconnect();
    }

    /**
     * Attempt to reconnect to the WebSocket server
     */
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
            this.dispatchEvent('reconnect_failed', {
                attempts: this.reconnectAttempts
            });
            return;
        }
        
        // Increase reconnect delay with exponential backoff
        const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
        
        console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
        
        this.dispatchEvent('reconnecting', {
            attempt: this.reconnectAttempts + 1,
            delay: delay
        });
        
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket && this.connected) {
            this.socket.disconnect();
            this.connected = false;
            console.log('WebSocket disconnected');
        }
    }

    /**
     * Join a terminal room to receive terminal-specific events
     * @param {string} terminalId - The terminal ID to join
     */
    joinTerminal(terminalId) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot join terminal - WebSocket not connected');
            return;
        }
        
        console.log(`Joining terminal: ${terminalId}`);
        this.socket.emit('join_terminal', {
            terminal_id: terminalId
        });
    }

    /**
     * Leave a terminal room
     * @param {string} terminalId - The terminal ID to leave
     */
    leaveTerminal(terminalId) {
        if (!this.connected || !this.socket) {
            return;
        }
        
        console.log(`Leaving terminal: ${terminalId}`);
        this.socket.emit('leave_terminal', {
            terminal_id: terminalId
        });
    }

    /**
     * Notify server about a new terminal being created
     * @param {string|number} portOrTerminalId - The terminal port or ID
     * @param {string} name - The terminal name
     * @param {number|null} port - The terminal port (optional if first parameter is port)
     */
    notifyTerminalCreated(portOrTerminalId, name, port = null) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify terminal creation - WebSocket not connected');
            return;
        }
        
        // Ensure port is always set correctly
        const terminalPort = port || portOrTerminalId;
        
        console.log(`Broadcasting terminal creation event: port=${terminalPort}, name=${name}`);
        
        this.socket.emit('terminal_created', {
            terminal_id: terminalPort, // Use the port as the terminal_id for consistency across clients
            port: terminalPort,
            name: name,
            sender_id: this.clientId
        });
    }

    /**
     * Notify server about a terminal being renamed
     * @param {string|number} portOrTerminalId - The terminal port or ID
     * @param {string} name - The new terminal name
     */
    notifyTerminalRenamed(portOrTerminalId, name) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify terminal rename - WebSocket not connected');
            return;
        }
        
        // Use the portOrTerminalId as both ID and port if needed
        let terminalId = portOrTerminalId;
        
        console.log(`Notifying terminal renamed: id=${terminalId}, new name="${name}"`);
        this.socket.emit('terminal_renamed', {
            terminal_id: terminalId,
            name: name
        });
    }

    /**
     * Notify server about a terminal being closed
     * @param {string|number} portOrTerminalId - The terminal port or ID
     */
    notifyTerminalClosed(portOrTerminalId) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify terminal closure - WebSocket not connected');
            return;
        }
        
        // Use the portOrTerminalId as both ID and port if needed
        let terminalId = portOrTerminalId;
        
        console.log(`Notifying terminal closed: id=${terminalId}`);
        this.socket.emit('terminal_closed', {
            terminal_id: terminalId
        });
    }

    /**
     * Notify server about a variable being updated
     * @param {string} terminalId - The terminal ID
     * @param {string} name - The variable name
     * @param {string} value - The variable value
     * @param {string} action - The action (create, update, delete)
     */
    notifyVariableUpdate(terminalId, name, value, action = 'update') {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify variable update - WebSocket not connected');
            return;
        }
        
        console.log(`Notifying variable ${action}: ${terminalId} - ${name}`);
        this.socket.emit('variable_update_request', {
            terminal_id: terminalId,
            name: name,
            value: value,
            action: action
        });
    }

    /**
     * Notify server about a playbook being updated
     * @param {string} terminalId - The terminal ID
     * @param {string} name - The playbook name
     * @param {string} action - The action (load, update, close)
     */
    notifyPlaybookUpdate(terminalId, name, action = 'update') {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify playbook update - WebSocket not connected');
            return;
        }
        
        console.log(`Notifying playbook ${action}: ${terminalId} - ${name}`);
        this.socket.emit('playbook_updated', {
            terminal_id: terminalId,
            name: name,
            action: action
        });
    }

    /**
     * Notify server about notes being updated
     * @param {string} terminalId - The terminal ID (null for global notes)
     * @param {string} content - The notes content
     */
    notifyNotesUpdate(terminalId, content) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify notes update - WebSocket not connected');
            return;
        }
        
        console.log(`Notifying notes update: ${terminalId || 'global'}`);
        this.socket.emit('notes_updated', {
            terminal_id: terminalId,
            content: content
        });
    }

    /**
     * Notify server that a client started editing a resource
     * @param {string} resourceId - The resource ID
     * @returns {Promise<boolean>} - Promise resolving to whether the lock was acquired
     */
    notifyEditingStarted(resourceId) {
        return new Promise((resolve, reject) => {
            if (!this.connected || !this.socket) {
                console.warn('Cannot notify editing start - WebSocket not connected');
                resolve(false);
                return;
            }
            
            console.log(`Notifying editing started: ${resourceId}`);
            
            // Set up one-time event handler for the response
            const responseHandler = (data) => {
                if (data.resource_id === resourceId) {
                    resolve(data.success);
                    this.socket.off('editing_lock_response', responseHandler);
                }
            };
            
            this.socket.on('editing_lock_response', responseHandler);
            
            // Set a timeout to prevent hanging
            const timeout = setTimeout(() => {
                this.socket.off('editing_lock_response', responseHandler);
                console.warn(`Editing lock request for ${resourceId} timed out`);
                resolve(false);
            }, 5000);
            
            // Send the event
            this.socket.emit('editing_started', {
                resource_id: resourceId
            });
        });
    }

    /**
     * Notify server that a client stopped editing a resource
     * @param {string} resourceId - The resource ID
     */
    notifyEditingStopped(resourceId) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot notify editing stop - WebSocket not connected');
            return;
        }
        
        console.log(`Notifying editing stopped: ${resourceId}`);
        this.socket.emit('editing_stopped', {
            resource_id: resourceId
        });
    }

    /**
     * Add event listener for WebSocket events
     * @param {string} event - The event name
     * @param {function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        
        this.eventListeners[event].push(callback);
        console.log(`Added event listener for ${event}`);
    }

    /**
     * Remove event listener
     * @param {string} event - The event name
     * @param {function} callback - The callback function to remove
     */
    removeEventListener(event, callback) {
        if (!this.eventListeners[event]) return;
        
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    /**
     * Dispatch event to registered listeners
     * @param {string} event - The event name
     * @param {object} data - The event data
     */
    dispatchEvent(event, data) {
        // Don't process events from ourselves unless they're connection events
        if (data && data.sender_id === this.clientId && 
            !['connection_established', 'connection_lost', 'reconnecting', 'reconnect_failed'].includes(event)) {
            return;
        }
        
        // Execute all registered callbacks
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} event handler:`, error);
                }
            });
        }
    }

    /**
     * Check if WebSocket is connected
     * @returns {boolean} - Whether the WebSocket is connected
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get the client ID
     * @returns {string} - The client ID
     */
    getClientId() {
        return this.clientId;
    }

    /**
     * Start periodic keepalive pings
     * @param {number} intervalMs - Interval in ms
     */
    startKeepAlive(intervalMs = 15000) {
        setInterval(() => {
            if (this.connected && this.socket) {
                console.log('Sending client_ping');
                this.socket.emit('client_ping');
            } else {
                console.warn('Skipping client_ping - not connected');
            }
        }, intervalMs);
    }
}

// Export a singleton instance
export default new WebSocketHandler();
