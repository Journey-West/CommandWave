/**
 * Terminal Manager Module
 * Manages terminal tabs, creation, switching and interaction
 */

import terminalAPI from '../api/terminal_api.js';

export default class TerminalManager {
    /**
     * Create a new Terminal Manager
     * @param {string} hostname - The hostname for terminal iframes
     */
    constructor(hostname = window.location.hostname) {
        this.hostname = hostname;
        this.activePorts = [];
        this.activeTerminal = null;
        
        // Initialize terminals
        this.initTerminals();
    }
    
    /**
     * Initialize terminal manager
     * Register events and set up existing terminals
     */
    async initTerminals() {
        try {
            // Set up initial tabs
            const tabButtons = document.querySelectorAll('.tab-btn');
            tabButtons.forEach(tab => {
                if (tab.classList.contains('add-tab')) return; // Skip "add tab" button
                
                const port = tab.getAttribute('data-port');
                if (port) {
                    this.activePorts.push(port);
                    tab.addEventListener('click', () => this.switchTerminal(port));
                }
            });
            
            // Set current active terminal
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                this.activeTerminal = activeTab.getAttribute('data-port');
            }
            
            // Setup new terminal button
            this.setupNewTerminalButton();
            
            // Setup new terminal modal buttons
            this.setupTerminalModalButtons();
            
            console.log('Terminal manager initialized with', this.activePorts.length, 'terminals');
        } catch (error) {
            console.error('Error initializing terminals:', error);
        }
    }
    
    /**
     * Set up the new terminal button
     */
    setupNewTerminalButton() {
        const addTabBtn = document.getElementById('addTabBtn');
        if (addTabBtn) {
            // Use direct function rather than arrow function to help with debugging
            addTabBtn.onclick = function() {
                console.log('Add tab button clicked');
                if (window.CommandWave && window.CommandWave.terminalManager) {
                    window.CommandWave.terminalManager.openNewTerminalModal();
                } else {
                    console.error('Terminal manager not found in global CommandWave object');
                    // Fallback - open the modal directly
                    const modal = document.getElementById('newTerminalModal');
                    if (modal) {
                        modal.classList.add('active');
                    }
                }
            };
        }
    }
    
    /**
     * Set up the terminal modal buttons
     */
    setupTerminalModalButtons() {
        // Cancel button
        const cancelBtn = document.getElementById('cancelTerminalBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (window.CommandWave && window.CommandWave.modalController) {
                    window.CommandWave.modalController.closeModal('newTerminalModal');
                }
            });
        }
        
        // Create terminal button
        const createBtn = document.getElementById('createTerminalSubmitBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.handleCreateTerminal();
            });
        }
        
        // Add enter key support for the terminal name input
        const nameInput = document.getElementById('newTerminalName');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleCreateTerminal();
                }
            });
        }
    }
    
    /**
     * Open the new terminal modal
     */
    openNewTerminalModal() {
        try {
            // Reset the form
            const nameInput = document.getElementById('newTerminalName');
            if (nameInput) {
                nameInput.value = '';
            }
            
            // Show the modal
            if (window.CommandWave && window.CommandWave.modalController) {
                const result = window.CommandWave.modalController.openModal('newTerminalModal');
                console.log('Opening newTerminalModal, result:', result);
                
                // Focus the input field
                if (nameInput) {
                    setTimeout(() => nameInput.focus(), 100);
                }
            } else {
                console.error('Modal controller not found');
                // Fallback - try to show the modal directly
                const modal = document.getElementById('newTerminalModal');
                if (modal) {
                    modal.classList.add('active');
                    const nameInput = document.getElementById('newTerminalName');
                    if (nameInput) {
                        setTimeout(() => nameInput.focus(), 100);
                    }
                }
            }
        } catch (error) {
            console.error('Error opening terminal modal:', error);
            // Create terminal directly if modal fails
            this.createNewTerminal('Terminal');
        }
    }
    
    /**
     * Handle the create terminal form submission
     */
    handleCreateTerminal() {
        const nameInput = document.getElementById('newTerminalName');
        let terminalName = 'Terminal';
        
        if (nameInput && nameInput.value.trim()) {
            terminalName = nameInput.value.trim();
        }
        
        // Close the modal
        if (window.CommandWave && window.CommandWave.modalController) {
            window.CommandWave.modalController.closeModal('newTerminalModal');
        }
        
        // Create the terminal
        this.createNewTerminal(terminalName);
    }
    
    /**
     * Switch to the specified terminal
     * @param {string} port - The port of the terminal to switch to
     */
    switchTerminal(port) {
        // Update tabs
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            if (tab.classList.contains('add-tab')) return; // Skip "add tab" button
            
            const tabPort = tab.getAttribute('data-port');
            if (tabPort === port) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update iframe visibility and active state
        document.querySelectorAll('.terminal-iframe').forEach(iframe => {
            const iframePort = iframe.getAttribute('data-port');
            if (iframePort === port) {
                iframe.classList.add('active');
            } else {
                iframe.classList.remove('active');
            }
        });
        
        // Update active terminal
        this.activeTerminal = port;
        
        // Custom event for terminal change
        document.dispatchEvent(new CustomEvent('terminalChanged', {
            detail: { port: port }
        }));
    }
    
    /**
     * Create a new terminal
     * @param {string} name - The name for the new terminal
     */
    async createNewTerminal(name = 'Terminal') {
        // Show loading indicator
        this.showTerminalLoading(true);
        
        try {
            // Request new terminal from server using the API module
            const newTerminal = await terminalAPI.createTerminal(name);
            
            // Add the new terminal to the UI without page reload
            this.addTerminalToUI(newTerminal.port, newTerminal.name);
            
            // Update active ports list
            this.activePorts.push(newTerminal.port.toString());
            
            // Switch to the new terminal
            this.switchTerminal(newTerminal.port.toString());
            
            // Hide loading indicator
            this.showTerminalLoading(false);
        } catch (error) {
            this.showTerminalLoading(false);
            this.showError('Error creating terminal: ' + error.message);
        }
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
                addTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            } else {
                addTabBtn.classList.remove('loading');
                addTabBtn.disabled = false;
                addTabBtn.innerHTML = '+';
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
     * Show an error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error('Terminal error:', message);
        // If we have a modal controller, use it to show the error
        if (window.CommandWave && window.CommandWave.errorHandler) {
            window.CommandWave.errorHandler.handleError(message, 'Terminal', true, false);
        } else {
            alert(`Terminal error: ${message}`);
        }
    }
}
