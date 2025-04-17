/**
 * terminal_manager.js - Modular terminal management for CommandWave
 * Handles terminal tab switching, creation, and interaction
 */

class TerminalManager {
    constructor() {
        this.activePorts = [];
        this.activeTerminalPort = null;
        this.hostname = document.getElementById('hostname')?.value || 'localhost';
        
        // Initialize manager
        this.init();
    }
    
    /**
     * Initialize terminal system
     */
    init() {
        // Get all terminal tabs
        this.loadActivePorts();
        
        // Set up tab handlers
        this.setupTabHandlers();
        
        // Set up new terminal button
        this.setupNewTerminalButton();
        
        console.log(`Terminal manager initialized with ${this.activePorts.length} terminals`);
    }
    
    /**
     * Load all active terminal ports
     */
    loadActivePorts() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        this.activePorts = Array.from(tabButtons).map(tab => {
            return tab.getAttribute('data-port');
        }).filter(port => port);
        
        // Set active terminal if available
        if (this.activePorts.length > 0) {
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                this.activeTerminalPort = activeTab.getAttribute('data-port');
            } else {
                this.activeTerminalPort = this.activePorts[0];
                this.activateTerminal(this.activeTerminalPort);
            }
        }
    }
    
    /**
     * Set up click handlers for terminal tabs
     */
    setupTabHandlers() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                const port = tab.getAttribute('data-port');
                if (port) {
                    this.switchTerminal(port);
                }
            });
        });
    }
    
    /**
     * Set up the new terminal button
     */
    setupNewTerminalButton() {
        const addTabBtn = document.getElementById('addTabBtn');
        if (addTabBtn) {
            addTabBtn.addEventListener('click', () => {
                this.createNewTerminal();
            });
        }
    }
    
    /**
     * Switch to a specific terminal
     * @param {string} port - The port of the terminal to activate
     */
    switchTerminal(port) {
        if (!port || !this.activePorts.includes(port)) {
            console.error(`Terminal port ${port} not found`);
            return;
        }
        
        // Update active terminal
        this.activeTerminalPort = port;
        
        // Update tab UI
        document.querySelectorAll('.tab-btn').forEach(tab => {
            const tabPort = tab.getAttribute('data-port');
            if (tabPort === port) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update frame visibility
        document.querySelectorAll('.terminal-frame').forEach(frame => {
            frame.style.display = 'none';
        });
        
        const activeFrame = document.getElementById(`terminal-${port}`);
        if (activeFrame) {
            activeFrame.style.display = 'block';
        }
        
        // Custom event for terminal change
        document.dispatchEvent(new CustomEvent('terminalChanged', {
            detail: { port: port }
        }));
    }
    
    /**
     * Create a new terminal
     */
    createNewTerminal() {
        // Show loading indicator
        this.showTerminalLoading(true);
        
        // Request new terminal from server
        fetch('/api/terminals/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Terminal' })
        })
        .then(response => response.json())
        .then(data => {
            this.showTerminalLoading(false);
            if (data.success) {
                console.log('New terminal created with port:', data.port);
                
                // Add the new terminal to the UI without page reload
                this.addTerminalToUI(data.port, data.name);
                
                // Update active ports list
                this.activePorts.push(data.port.toString());
                
                // Switch to the new terminal
                this.switchTerminal(data.port.toString());
            } else {
                this.showError(data.error || 'Failed to create new terminal');
            }
        })
        .catch(error => {
            this.showTerminalLoading(false);
            this.showError('Network error: ' + error.message);
        });
    }
    
    /**
     * Add a new terminal tab and iframe to the UI
     * @param {number|string} port - The port number for the terminal
     * @param {string} name - Display name for the terminal tab
     */
    addTerminalToUI(port, name = 'Terminal') {
        port = port.toString();
        
        // Create new tab button
        const tabsContainer = document.querySelector('.terminal-tabs');
        const addTabBtn = document.getElementById('addTabBtn');
        
        if (tabsContainer && addTabBtn) {
            // Create new tab button element
            const newTabBtn = document.createElement('button');
            newTabBtn.className = 'tab-btn';
            newTabBtn.setAttribute('data-port', port);
            newTabBtn.textContent = name;
            
            // Insert before the add tab button
            tabsContainer.insertBefore(newTabBtn, addTabBtn);
            
            // Add click event listener
            newTabBtn.addEventListener('click', () => {
                this.switchTerminal(port);
            });
        }
        
        // Create new terminal iframe
        const terminalContainer = document.querySelector('.terminal-container');
        if (terminalContainer) {
            // Create new iframe element
            const newIframe = document.createElement('iframe');
            newIframe.className = 'terminal-iframe';
            newIframe.id = `terminal-${port}`;
            newIframe.setAttribute('data-port', port);
            
            // Set the iframe src to the new terminal URL
            const hostname = this.hostname;
            newIframe.src = `http://${hostname}:${port}`;
            
            // Append to the terminal container
            terminalContainer.appendChild(newIframe);
        }
    }
    
    /**
     * Show/hide terminal loading indicator
     * @param {boolean} show - Whether to show or hide the loading indicator
     */
    showTerminalLoading(show) {
        const addTabBtn = document.getElementById('addTabBtn');
        if (addTabBtn) {
            if (show) {
                addTabBtn.classList.add('loading');
                addTabBtn.disabled = true;
                addTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            } else {
                addTabBtn.classList.remove('loading');
                addTabBtn.disabled = false;
                addTabBtn.innerHTML = '<i class="fas fa-plus"></i> New Terminal';
            }
        }
    }
    
    /**
     * Activate a specific terminal
     * @param {string} port - The port of the terminal to activate
     */
    activateTerminal(port) {
        const tab = document.querySelector(`.tab-btn[data-port="${port}"]`);
        if (tab) {
            tab.click();
        }
    }
    
    /**
     * Close a terminal
     * @param {string} port - The port of the terminal to close
     */
    closeTerminal(port) {
        // This will be implemented in future updates
        // It will require server-side API support to terminate the terminal
        console.log(`Close terminal ${port} functionality will be implemented in a future update`);
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    showError(message) {
        if (window.showError) {
            window.showError(message);
        } else {
            console.error(message);
            alert(message);
        }
    }
}

// Export for use in other modules
export default TerminalManager;
