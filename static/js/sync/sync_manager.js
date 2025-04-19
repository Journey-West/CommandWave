/**
 * sync_manager.js
 * Coordinates real-time synchronization between modules and WebSocket communications
 */

import WebSocketHandler from './websocket_handler.js';
import NotificationManager from '../ui/notification_manager.js';

class SyncManager {
    constructor() {
        this.initialized = false;
        this.terminalManager = null;
        this.variableManager = null;
        this.playbookManager = null;
        this.notesManager = null;
        this.presenceManager = null;
        
        // Default debounce time for synchronization events (ms)
        this.debounceTime = 250;
        
        // Debounce timers for different sync operations
        this.debounceTimers = {
            variables: {},
            playbooks: {},
            notes: {}
        };
        
        // Initialize global state object if it doesn't exist
        if (!window.state) {
            window.state = {
                terminals: {},
                activeTerminal: null,
                editingLocks: {}
            };
        }
    }
    
    /**
     * Initialize the sync manager with references to other modules
     * @param {object} modules - Object containing references to other modules
     */
    init(modules) {
        if (this.initialized) return;
        
        console.log('Initializing SyncManager...');
        
        // Store references to other modules
        this.terminalManager = modules.terminalManager || window.CommandWave?.terminalManager;
        this.variableManager = modules.variableManager || window.CommandWave?.variableManager;
        this.playbookManager = modules.playbookManager || window.CommandWave?.playbookManager;
        this.notesManager = modules.notesManager || window.CommandWave?.notesManager;
        this.presenceManager = modules.presenceManager || window.CommandWave?.presenceManager;
        
        // Initialize WebSocket handler
        this.initWebSocketEvents();
        
        // Set up listeners for local state changes
        this.initLocalEventListeners();
        
        this.initialized = true;
        console.log('SyncManager initialized');
    }
    
    /**
     * Initialize WebSocket event listeners
     */
    initWebSocketEvents() {
        // Terminal events
        WebSocketHandler.addEventListener('terminal_created', (data) => {
            this.handleTerminalCreated(data);
        });
        
        WebSocketHandler.addEventListener('terminal_renamed', (data) => {
            this.handleTerminalRenamed(data);
        });
        
        WebSocketHandler.addEventListener('terminal_closed', (data) => {
            this.handleTerminalClosed(data);
        });
        
        // Variable events
        WebSocketHandler.addEventListener('variable_changed', (data) => {
            this.handleVariableChanged(data);
        });
        
        // Playbook events
        WebSocketHandler.addEventListener('playbook_changed', (data) => {
            this.handlePlaybookChanged(data);
        });
        
        // Notes events
        WebSocketHandler.addEventListener('notes_changed', (data) => {
            this.handleNotesChanged(data);
        });
        
        WebSocketHandler.addEventListener('global_notes_changed', (data) => {
            this.handleGlobalNotesChanged(data);
        });
        
        // Connection events
        WebSocketHandler.addEventListener('connection_established', (data) => {
            console.log('Connected to sync server:', data);
            
            // Notify UI
            try {
                NotificationManager.show(
                    'Connected to collaboration server',
                    'Real-time synchronization enabled',
                    'success',
                    3000
                );
            } catch (error) {
                console.warn('Error showing connection notification:', error);
            }
        });
        
        WebSocketHandler.addEventListener('connection_lost', (data) => {
            console.log('Lost connection to sync server:', data);
            
            // Notify UI
            try {
                NotificationManager.show(
                    'Connection lost',
                    'Connection to collaboration server lost. Attempting to reconnect...',
                    'warning',
                    5000
                );
            } catch (error) {
                console.warn('Error showing notification:', error);
            }
        });
        
        WebSocketHandler.addEventListener('reconnecting', (data) => {
            console.log(`Reconnecting to sync server (attempt ${data.attempt})...`);
            
            // Notify UI for extended reconnection attempts
            if (data.attempt > 1) {
                try {
                    NotificationManager.show(
                        'Reconnecting',
                        `Reconnecting to collaboration server (attempt ${data.attempt})...`,
                        'info',
                        3000
                    );
                } catch (error) {
                    console.warn('Error showing reconnection notification:', error);
                }
            }
        });
    }
    
    /**
     * Initialize listeners for local state changes to synchronize to other clients
     */
    initLocalEventListeners() {
        // Terminal events
        document.addEventListener('terminal-created', (event) => {
            const terminalId = event.detail.terminalId || `terminal-${event.detail.port}`;
            const name = event.detail.name || 'New Terminal';
            const port = event.detail.port;
            
            // Notify other clients
            this.syncTerminalCreated(port, name);
        });
        
        document.addEventListener('terminal-renamed', (event) => {
            const terminalId = event.detail.terminalId || `terminal-${event.detail.port}`;
            const name = event.detail.name;
            
            // Notify other clients
            this.syncTerminalRenamed(event.detail.port, name);
        });
        
        document.addEventListener('terminal-closed', (event) => {
            const terminalId = event.detail.terminalId || `terminal-${event.detail.port}`;
            
            // Notify other clients
            this.syncTerminalClosed(event.detail.port);
        });
        
        // Variable events
        document.addEventListener('variable-created', (event) => {
            this.syncVariableChange(event.detail.terminalId, event.detail.name, event.detail.value, 'create');
        });
        
        document.addEventListener('variable-updated', (event) => {
            this.syncVariableChange(event.detail.terminalId, event.detail.name, event.detail.value, 'update');
        });
        
        document.addEventListener('variable-deleted', (event) => {
            this.syncVariableChange(event.detail.terminalId, event.detail.name, null, 'delete');
        });
        
        // Playbook events
        document.addEventListener('playbook-loaded', (event) => {
            this.syncPlaybookChange(event.detail.terminalId, event.detail.name, 'load');
        });
        
        document.addEventListener('playbook-updated', (event) => {
            this.syncPlaybookChange(event.detail.terminalId, event.detail.name, 'update');
        });
        
        document.addEventListener('playbook-closed', (event) => {
            this.syncPlaybookChange(event.detail.terminalId, event.detail.name, 'close');
        });
        
        // Notes events
        document.addEventListener('notes-updated', (event) => {
            const terminalId = event.detail.terminalId;
            const content = event.detail.content;
            
            this.syncNotesChange(terminalId, content);
        });
        
        document.addEventListener('global-notes-updated', (event) => {
            const content = event.detail.content;
            
            this.syncNotesChange(null, content);
        });
        
        // Setup editing events for resources
        this.initResourceEditingEvents();
    }
    
    /**
     * Initialize event listeners for resource editing to manage locks
     */
    initResourceEditingEvents() {
        // Global notes editing
        const globalNotesArea = document.querySelector('#globalNotesContent');
        if (globalNotesArea) {
            // Acquire lock on focus
            globalNotesArea.addEventListener('focus', () => {
                this.presenceManager?.requestEditingLock('notes:global');
            });
            
            // Release lock on blur
            globalNotesArea.addEventListener('blur', () => {
                this.presenceManager?.releaseEditingLock('notes:global');
            });
        }
        
        // Terminal notes editing - delegate to document since notes areas are created dynamically
        document.addEventListener('focusin', (event) => {
            const notesArea = event.target.closest('.tab-notes-container textarea');
            if (notesArea) {
                const terminalId = notesArea.closest('.tab-notes-container')?.dataset?.terminalId;
                if (terminalId) {
                    this.presenceManager?.requestEditingLock(`notes:${terminalId}`);
                }
            }
        });
        
        document.addEventListener('focusout', (event) => {
            const notesArea = event.target.closest('.tab-notes-container textarea');
            if (notesArea) {
                const terminalId = notesArea.closest('.tab-notes-container')?.dataset?.terminalId;
                if (terminalId) {
                    this.presenceManager?.releaseEditingLock(`notes:${terminalId}`);
                }
            }
        });
        
        // Playbook editing - delegate to document since playbooks are loaded dynamically
        document.addEventListener('focusin', (event) => {
            const playbookEditor = event.target.closest('.playbook-editor');
            if (playbookEditor) {
                const playbookName = playbookEditor.dataset?.playbookName;
                if (playbookName) {
                    this.presenceManager?.requestEditingLock(`playbook:${playbookName}`);
                }
            }
        });
        
        document.addEventListener('focusout', (event) => {
            const playbookEditor = event.target.closest('.playbook-editor');
            if (playbookEditor) {
                const playbookName = playbookEditor.dataset?.playbookName;
                if (playbookName) {
                    this.presenceManager?.releaseEditingLock(`playbook:${playbookName}`);
                }
            }
        });
    }
    
    /**
     * Start the WebSocket connection
     * @param {string} username - Username for this client
     */
    connect(username = 'Anonymous User') {
        WebSocketHandler.init(username);
    }
    
    /**
     * Handle a terminal created event from a remote client
     * @param {object} data - Terminal created event data
     */
    handleTerminalCreated(data) {
        // Skip if we're missing data or if this terminal already exists
        if (!data.terminal_id || !data.port) return;
        if (window.state.terminals[data.terminal_id]) return;
        
        console.log(`Remote terminal created: ${data.terminal_id} (${data.name})`);
        
        // Create a new terminal in the local state
        window.state.terminals[data.terminal_id] = {
            port: data.port,
            name: data.name || 'Remote Terminal',
            variables: {},
            playbooks: {}
        };
        
        // Let the terminal manager handle the UI update if available
        if (this.terminalManager && typeof this.terminalManager.addRemoteTerminal === 'function') {
            this.terminalManager.addRemoteTerminal(data.terminal_id, data.port, data.name);
        } else {
            // Fallback: Create the UI elements manually
            this.createTerminalTab(data.terminal_id, data.port, data.name);
        }
        
        // Show notification
        try {
            NotificationManager.show(
                'New terminal created',
                `New terminal "${data.name}" created by another user`,
                'info',
                3000
            );
        } catch (error) {
            console.warn('Error showing notification:', error);
        }
    }
    
    /**
     * Create a new terminal tab in the UI
     * @param {string} terminalId - Terminal ID
     * @param {number} port - Terminal port
     * @param {string} name - Terminal name
     */
    createTerminalTab(terminalId, port, name) {
        // Don't create if it already exists
        if (document.querySelector(`.tab-btn[data-port="${port}"]`)) {
            return;
        }
        
        // Find the tab container
        const tabContainer = document.querySelector('.terminal-tabs');
        if (!tabContainer) return;
        
        // Create new tab button
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-btn';
        tabButton.setAttribute('data-port', port);
        tabButton.textContent = name || `Terminal ${port}`;
        
        // Insert before the add tab button
        const addTabBtn = document.querySelector('#addTabBtn');
        if (addTabBtn) {
            tabContainer.insertBefore(tabButton, addTabBtn);
        } else {
            tabContainer.appendChild(tabButton);
        }
        
        // Create new iframe
        const terminalContainer = document.querySelector('.terminal-container');
        if (terminalContainer) {
            // Create iframe
            const iframe = document.createElement('iframe');
            iframe.className = 'terminal-iframe';
            iframe.id = `terminal-${port}`;
            iframe.setAttribute('data-port', port);
            
            // Set iframe src based on hostname
            const hostname = window.location.hostname || 'localhost';
            iframe.src = `http://${hostname}:${port}`;
            
            terminalContainer.appendChild(iframe);
            
            // Add click event to the button to switch terminals
            tabButton.addEventListener('click', () => {
                // Deactivate other terminals
                document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.terminal-iframe').forEach(iframe => iframe.classList.remove('active'));
                
                // Activate this terminal
                tabButton.classList.add('active');
                iframe.classList.add('active');
            });
        }
    }
    
    /**
     * Handle a terminal renamed event from a remote client
     * @param {object} data - Terminal renamed event data
     */
    handleTerminalRenamed(data) {
        // Skip if we're missing data
        if (!data.terminal_id || !data.name) return;
        
        console.log(`Remote terminal renamed: ${data.terminal_id} to ${data.name}`);
        
        // Update the terminal name in state
        if (window.state.terminals[data.terminal_id]) {
            window.state.terminals[data.terminal_id].name = data.name;
        }
        
        // Update the tab button
        const tabButton = document.querySelector(`.tab-btn[data-port="${data.port}"]`);
        if (tabButton) {
            tabButton.textContent = data.name;
        }
        
        // Show notification if this is the active terminal
        if (window.state.activeTerminal === data.terminal_id) {
            try {
                NotificationManager.show(
                    'Terminal renamed',
                    `Terminal renamed to "${data.name}" by another user`,
                    'info',
                    3000
                );
            } catch (error) {
                console.warn('Error showing terminal renamed notification:', error);
            }
        }
    }
    
    /**
     * Handle a terminal closed event from a remote client
     * @param {object} data - Terminal closed event data
     */
    handleTerminalClosed(data) {
        // Skip if we're missing data
        if (!data.terminal_id) return;
        
        console.log(`Remote terminal closed: ${data.terminal_id}`);
        
        // Get terminal info before removal
        const terminalInfo = window.state.terminals[data.terminal_id];
        
        // Remove from state
        if (window.state.terminals[data.terminal_id]) {
            delete window.state.terminals[data.terminal_id];
        }
        
        // Remove tab button
        const tabButton = document.querySelector(`.tab-btn[data-port="${data.port}"]`);
        if (tabButton) {
            tabButton.remove();
        }
        
        // Remove terminal container
        const terminalContainer = document.querySelector(`.terminal-container`);
        if (terminalContainer) {
            const iframe = terminalContainer.querySelector(`iframe[data-port="${data.port}"]`);
            if (iframe) {
                iframe.remove();
            }
        }
        
        // Show notification
        if (terminalInfo && terminalInfo.name) {
            try {
                NotificationManager.show(
                    'Terminal closed',
                    `Terminal "${terminalInfo.name}" was closed by another user`,
                    'info',
                    3000
                );
            } catch (error) {
                console.warn('Error showing terminal closed notification:', error);
            }
        }
        
        // If this was the active terminal, activate the first available
        if (window.state.activeTerminal === data.terminal_id) {
            const firstTabBtn = document.querySelector('.tab-btn[data-port]');
            if (firstTabBtn) {
                // Dispatch a click event to activate
                firstTabBtn.click();
            }
        }
    }
    
    /**
     * Handle a variable changed event from a remote client
     * @param {object} data - Variable changed event data
     */
    handleVariableChanged(data) {
        // Skip if we're missing data
        if (!data.terminal_id || !data.name) return;
        
        // Normalize terminal ID format - we need the port number
        const terminalId = data.terminal_id;
        const portMatch = terminalId.match(/\d+$/);
        const port = portMatch ? portMatch[0] : terminalId;
        
        console.log(`Remote variable ${data.action}: terminal=${terminalId}, port=${port}, name=${data.name}, value=${data.value}`);
        
        // Initialize state for this terminal if it doesn't exist
        if (!window.state.terminals[terminalId]) {
            window.state.terminals[terminalId] = {
                port: port,
                name: `Terminal ${port}`,
                variables: {},
                playbooks: {}
            };
        }
        
        // Update variable in state based on action
        switch (data.action) {
            case 'create':
            case 'update':
                // Create or update the variable
                if (!window.state.terminals[terminalId].variables) {
                    window.state.terminals[terminalId].variables = {};
                }
                window.state.terminals[terminalId].variables[data.name] = data.value;
                break;
                
            case 'delete':
                // Delete the variable
                if (window.state.terminals[terminalId].variables && 
                    window.state.terminals[terminalId].variables[data.name]) {
                    delete window.state.terminals[terminalId].variables[data.name];
                }
                break;
                
            default:
                console.warn(`Unknown variable action: ${data.action}`);
                return;
        }
        
        // Try to directly update the variable manager
        try {
            if (this.variableManager) {
                // Force update of the variable manager state for this terminal
                if (!this.variableManager.variableSets[port]) {
                    this.variableManager.variableSets[port] = {};
                }
                
                // Update the variable in the variable manager's state
                if (data.action === 'create' || data.action === 'update') {
                    this.variableManager.variableSets[port][data.name] = { value: data.value };
                } else if (data.action === 'delete') {
                    delete this.variableManager.variableSets[port][data.name];
                }
                
                // Only update UI if this is the active terminal
                if (this.variableManager.activeTabId === port) {
                    this.variableManager.updateVariableUI();
                    
                    // Show notification
                    const actionText = data.action === 'create' ? 'created' : 
                                      data.action === 'update' ? 'updated' : 'deleted';
                    try {
                        NotificationManager.show(
                            `Variable ${actionText}`,
                            `Variable "${data.name}" ${actionText} by another user`,
                            'info',
                            3000
                        );
                    } catch (error) {
                        console.warn('Error showing variable update notification:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating variable manager:', error);
            // Fallback: Update variable inputs manually
            this.updateVariableInputs(terminalId);
        }
    }
    
    /**
     * Update variable inputs in the UI
     * @param {string} terminalId - Terminal ID
     */
    updateVariableInputs(terminalId) {
        // Find the variable inputs container
        const container = document.getElementById('variableInputsContainer');
        if (!container) return;
        
        // Get variables for this terminal
        const variables = window.state.terminals[terminalId]?.variables || {};
        
        // Clear existing inputs
        container.innerHTML = '';
        
        // Create inputs for each variable
        Object.entries(variables).forEach(([name, value]) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'variable-input-group';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'variable-name';
            nameSpan.textContent = name;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'variable-value';
            input.setAttribute('data-variable-name', name);
            input.value = value;
            
            inputGroup.appendChild(nameSpan);
            inputGroup.appendChild(input);
            container.appendChild(inputGroup);
        });
        
        // Add "Add Variable" button if not present
        if (!document.querySelector('#addVariableBtn')) {
            const addBtn = document.createElement('button');
            addBtn.id = 'addVariableBtn';
            addBtn.className = 'add-variable-btn';
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Variable';
            container.appendChild(addBtn);
        }
    }
    
    /**
     * Handle a playbook changed event from a remote client
     * @param {object} data - Playbook changed event data
     */
    handlePlaybookChanged(data) {
        // Skip if we're missing data
        if (!data.terminal_id || !data.name) return;
        
        // Extract raw terminal ID if it has a prefix
        const terminalId = data.terminal_id.startsWith('terminal-') 
            ? data.terminal_id 
            : `terminal-${data.terminal_id}`;
        
        console.log(`Remote playbook ${data.action}: ${terminalId} - ${data.name}`);
        
        // Use the playbook manager to handle the change if available
        if (this.playbookManager) {
            switch (data.action) {
                case 'load':
                    // Load the playbook if not already loaded
                    if (window.state.activeTerminal === terminalId && 
                        (!window.state.terminals[terminalId]?.playbooks || 
                         !window.state.terminals[terminalId].playbooks[data.name])) {
                        this.playbookManager.loadPlaybook(data.name);
                    }
                    break;
                    
                case 'update':
                    // Reload the playbook if it's currently active
                    if (window.state.activeTerminal === terminalId && 
                        window.state.terminals[terminalId]?.playbooks && 
                        window.state.terminals[terminalId].playbooks[data.name]) {
                        this.playbookManager.loadPlaybook(data.name);
                    }
                    break;
                    
                case 'close':
                    // Close the playbook if it's currently active
                    if (window.state.activeTerminal === terminalId && 
                        window.state.terminals[terminalId]?.playbooks && 
                        window.state.terminals[terminalId].playbooks[data.name]) {
                        this.playbookManager.closePlaybook(data.name);
                    }
                    break;
                    
                default:
                    console.warn(`Unknown playbook action: ${data.action}`);
                    break;
            }
        }
        
        // Show notification if this is the active terminal
        if (window.state.activeTerminal === terminalId) {
            const actionText = data.action === 'load' ? 'loaded' : 
                              data.action === 'update' ? 'updated' : 'closed';
            
            try {
                NotificationManager.show(
                    `Playbook ${actionText}`,
                    `Playbook "${data.name}" ${actionText} by another user`,
                    'info',
                    3000
                );
            } catch (error) {
                console.warn('Error showing playbook update notification:', error);
            }
        }
    }
    
    /**
     * Handle a notes changed event from a remote client
     * @param {object} data - Notes changed event data
     */
    handleNotesChanged(data) {
        // Skip if we're missing terminal ID
        if (!data.terminal_id) return;
        
        // Extract raw terminal ID if it has a prefix
        const terminalId = data.terminal_id.startsWith('terminal-') 
            ? data.terminal_id 
            : `terminal-${data.terminal_id}`;
        
        console.log(`Remote notes update: ${terminalId}`);
        
        // Skip if this isn't the active terminal
        if (window.state.activeTerminal !== terminalId) return;
        
        // Use the notes manager to update if available
        if (this.notesManager && typeof this.notesManager.updateTabNotes === 'function') {
            this.notesManager.updateTabNotes(terminalId, data.content);
        } else {
            // Fallback: Update notes textarea manually
            const notesArea = document.querySelector(`.tab-notes-container[data-terminal-id="${terminalId}"] textarea`);
            if (notesArea) {
                notesArea.value = data.content;
            }
        }
        
        // Show notification
        try {
            NotificationManager.show(
                'Notes updated',
                'Terminal notes updated by another user',
                'info',
                3000
            );
        } catch (error) {
            console.warn('Error showing notes update notification:', error);
        }
    }
    
    /**
     * Handle a global notes changed event from a remote client
     * @param {object} data - Global notes changed event data
     */
    handleGlobalNotesChanged(data) {
        console.log('Remote global notes update');
        
        // Use the notes manager to update if available
        if (this.notesManager && typeof this.notesManager.updateGlobalNotes === 'function') {
            this.notesManager.updateGlobalNotes(data.content);
        } else {
            // Fallback: Update global notes textarea manually
            const notesArea = document.getElementById('globalNotesContent');
            if (notesArea) {
                notesArea.value = data.content;
            }
        }
        
        // Show notification
        try {
            NotificationManager.show(
                'Global notes updated',
                'Global notes updated by another user',
                'info',
                3000
            );
        } catch (error) {
            console.warn('Error showing global notes update notification:', error);
        }
    }
    
    /**
     * Sync a variable change to other clients (debounced)
     * @param {string} terminalId - Terminal ID
     * @param {string} name - Variable name
     * @param {string} value - Variable value
     * @param {string} action - Action (create, update, delete)
     */
    syncVariableChange(terminalId, name, value, action) {
        // Generate a debounce key for this specific variable
        const debounceKey = `${terminalId}:${name}`;
        
        // Clear any existing timeout for this variable
        if (this.debounceTimers.variables[debounceKey]) {
            clearTimeout(this.debounceTimers.variables[debounceKey]);
        }
        
        // Set a new timeout
        this.debounceTimers.variables[debounceKey] = setTimeout(() => {
            // Send to server
            WebSocketHandler.notifyVariableUpdate(terminalId, name, value, action);
            
            // Clear the timer reference
            delete this.debounceTimers.variables[debounceKey];
        }, this.debounceTime);
    }
    
    /**
     * Sync a playbook change to other clients (debounced)
     * @param {string} terminalId - Terminal ID
     * @param {string} name - Playbook name
     * @param {string} action - Action (load, update, close)
     */
    syncPlaybookChange(terminalId, name, action) {
        // Generate a debounce key for this specific playbook
        const debounceKey = `${terminalId}:${name}`;
        
        // Clear any existing timeout for this playbook
        if (this.debounceTimers.playbooks[debounceKey]) {
            clearTimeout(this.debounceTimers.playbooks[debounceKey]);
        }
        
        // Set a new timeout
        this.debounceTimers.playbooks[debounceKey] = setTimeout(() => {
            // Send to server
            WebSocketHandler.notifyPlaybookUpdate(terminalId, name, action);
            
            // Clear the timer reference
            delete this.debounceTimers.playbooks[debounceKey];
        }, this.debounceTime);
    }
    
    /**
     * Sync a notes change to other clients (debounced)
     * @param {string} terminalId - Terminal ID (null for global notes)
     * @param {string} content - Notes content
     */
    syncNotesChange(terminalId, content) {
        // Generate a debounce key
        const debounceKey = terminalId || 'global';
        
        // Clear any existing timeout for these notes
        if (this.debounceTimers.notes[debounceKey]) {
            clearTimeout(this.debounceTimers.notes[debounceKey]);
        }
        
        // Set a new timeout
        this.debounceTimers.notes[debounceKey] = setTimeout(() => {
            // Send to server
            WebSocketHandler.notifyNotesUpdate(terminalId, content);
            
            // Clear the timer reference
            delete this.debounceTimers.notes[debounceKey];
        }, this.debounceTime);
    }

    /**
     * Sync terminal creation to other clients
     * @param {string} port - Terminal port
     * @param {string} name - Terminal name
     */
    syncTerminalCreated(port, name) {
        console.log(`Broadcasting terminal creation: port=${port}, name=${name}`);
        WebSocketHandler.notifyTerminalCreated(port, name);
    }
    
    /**
     * Sync terminal rename to other clients
     * @param {string} port - Terminal port
     * @param {string} name - New terminal name
     */
    syncTerminalRenamed(port, name) {
        console.log(`Broadcasting terminal rename: port=${port}, name=${name}`);
        WebSocketHandler.notifyTerminalRenamed(port, name);
    }
    
    /**
     * Sync terminal closure to other clients
     * @param {string} port - Terminal port
     */
    syncTerminalClosed(port) {
        console.log(`Broadcasting terminal closure: port=${port}`);
        WebSocketHandler.notifyTerminalClosed(port);
    }
}

// Export a singleton instance
export default new SyncManager();
