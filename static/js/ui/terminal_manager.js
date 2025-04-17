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
        const newTerminalBtn = document.getElementById('newTerminalBtn');
        if (newTerminalBtn) {
            newTerminalBtn.addEventListener('click', () => {
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
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            this.showTerminalLoading(false);
            if (data.success) {
                console.log('New terminal created, reloading page');
                window.location.reload(); // Will be improved in future to avoid full page reload
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
     * Show/hide terminal loading indicator
     * @param {boolean} show - Whether to show or hide the loading indicator
     */
    showTerminalLoading(show) {
        const newTerminalBtn = document.getElementById('newTerminalBtn');
        if (newTerminalBtn) {
            if (show) {
                newTerminalBtn.classList.add('loading');
                newTerminalBtn.disabled = true;
                newTerminalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            } else {
                newTerminalBtn.classList.remove('loading');
                newTerminalBtn.disabled = false;
                newTerminalBtn.innerHTML = '<i class="fas fa-plus"></i> New Terminal';
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
