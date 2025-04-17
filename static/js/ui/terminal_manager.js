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
    }
    
    /**
     * Initialize terminal manager
     */
    init() {
        try {
            // Initialize terminals
            this.initTerminals();
            console.log('Terminal manager initialization complete');
        } catch (error) {
            console.error('Error initializing terminal manager:', error);
        }
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
                    // Single click to switch terminal
                    tab.addEventListener('click', () => this.switchTerminal(port));
                    
                    // Double click to rename terminal
                    tab.addEventListener('dblclick', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openRenameTerminalModal(port, tab.textContent);
                    });
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
            
            // Setup rename terminal modal buttons
            this.setupRenameTerminalModalButtons();
            
            // Manually ensure the modal can be found
            this.ensureTerminalModal();
            
            // Load terminal names from localStorage
            this.loadTerminalNames();
            
            console.log('Terminal manager initialized with', this.activePorts.length, 'terminals');
        } catch (error) {
            console.error('Error initializing terminals:', error);
        }
    }
    
    /**
     * Ensure the terminal modal is properly set up
     */
    ensureTerminalModal() {
        // Check if the modal exists with correct class
        const modal = document.getElementById('newTerminalModal');
        if (!modal) {
            console.error('Terminal modal not found in the DOM');
            return;
        }
        
        // Ensure it has the right class
        if (!modal.classList.contains('modal-container')) {
            console.log('Adding modal-container class to terminal modal');
            modal.classList.add('modal-container');
        }
        
        // Ensure close button has the right class
        const closeBtn = modal.querySelector('.modal-header button');
        if (closeBtn && !closeBtn.classList.contains('modal-close')) {
            console.log('Adding modal-close class to terminal modal close button');
            closeBtn.classList.add('modal-close');
        }
        
        // Add direct event handler to "+" button
        const addBtn = document.getElementById('addTabBtn');
        if (addBtn) {
            console.log('Setting up direct terminal button handler');
            // Use direct DOM method to avoid conflicts with other handlers
            addBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showNewTerminalModal();
                return false;
            };
        }
    }
    
    /**
     * Direct method to show the terminal modal using DOM methods
     * This bypasses any potential issues with the modal controller
     */
    showNewTerminalModal() {
        console.log('Directly showing new terminal modal');
        const modal = document.getElementById('newTerminalModal');
        if (modal) {
            // Reset input field
            const nameInput = document.getElementById('newTerminalName');
            if (nameInput) {
                nameInput.value = '';
            }
            
            // Show modal directly
            modal.classList.add('active');
            
            // Focus the input
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }
        } else {
            console.error('Cannot find newTerminalModal element');
        }
    }
    
    /**
     * Set up the new terminal button
     */
    setupNewTerminalButton() {
        const addTabBtn = document.getElementById('addTabBtn');
        if (addTabBtn) {
            // Use direct function rather than arrow function to help with debugging
            addTabBtn.addEventListener('click', (e) => {
                console.log('Add tab button clicked');
                e.preventDefault();
                e.stopPropagation();
                
                // Try using the modal controller first
                if (window.CommandWave && window.CommandWave.modalController) {
                    const result = window.CommandWave.modalController.openModal('newTerminalModal');
                    console.log('Modal controller result:', result);
                    
                    // If that fails, use direct DOM manipulation
                    if (!result) {
                        this.showNewTerminalModal();
                    }
                } else {
                    // Fallback to direct DOM manipulation
                    this.showNewTerminalModal();
                }
                
                return false;
            });
        } else {
            console.error('Add tab button not found');
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
                console.log('Cancel terminal button clicked');
                // Try modal controller first
                if (window.CommandWave && window.CommandWave.modalController) {
                    window.CommandWave.modalController.closeModal('newTerminalModal');
                }
                
                // Fallback to direct DOM manipulation
                const modal = document.getElementById('newTerminalModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Create terminal button
        const createBtn = document.getElementById('createTerminalSubmitBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                console.log('Create terminal button clicked');
                this.handleCreateTerminal();
            });
        }
        
        // Add enter key support for the terminal name input
        const nameInput = document.getElementById('newTerminalName');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed in terminal name input');
                    this.handleCreateTerminal();
                }
            });
        }
    }
    
    /**
     * Set up the rename terminal modal buttons
     */
    setupRenameTerminalModalButtons() {
        // Cancel button
        const cancelBtn = document.getElementById('cancelRenameBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('Cancel rename button clicked');
                // Try modal controller first
                if (window.CommandWave && window.CommandWave.modalController) {
                    window.CommandWave.modalController.closeModal('renameTerminalModal');
                }
                
                // Fallback to direct DOM manipulation
                const modal = document.getElementById('renameTerminalModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Rename terminal button
        const renameBtn = document.getElementById('renameTerminalSubmitBtn');
        if (renameBtn) {
            renameBtn.addEventListener('click', () => {
                console.log('Rename terminal button clicked');
                this.handleRenameTerminal();
            });
        }
        
        // Delete terminal button with hold-to-delete functionality
        this.setupHoldToDeleteButton();
        
        // Add enter key support for the terminal name input
        const nameInput = document.getElementById('renameTerminalName');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed in rename terminal name input');
                    this.handleRenameTerminal();
                }
            });
        }
    }
    
    /**
     * Setup the hold-to-delete functionality for the delete terminal button
     */
    setupHoldToDeleteButton() {
        const deleteBtn = document.getElementById('deleteTerminalBtn');
        const HOLD_TIME = 3000; // 3 seconds in milliseconds
        
        if (!deleteBtn) return;
        
        const progressBar = deleteBtn.querySelector('.delete-progress');
        const countdownEl = deleteBtn.querySelector('.delete-countdown');
        
        let holdStartTime = 0;
        let holdTimer = null;
        let animationFrameId = null;
        
        // Handle mouse down - start hold timer
        deleteBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // Prevent accidental double-clicks
            if (holdTimer !== null) return;
            
            holdStartTime = Date.now();
            deleteBtn.classList.add('delete-active');
            
            // Start the progress animation
            this.updateDeleteProgress(progressBar, countdownEl, 0, HOLD_TIME);
            
            // Update the progress continuously
            const updateProgress = () => {
                const elapsed = Date.now() - holdStartTime;
                const percentage = Math.min(100, (elapsed / HOLD_TIME) * 100);
                
                this.updateDeleteProgress(progressBar, countdownEl, percentage, HOLD_TIME);
                
                if (percentage < 100) {
                    animationFrameId = requestAnimationFrame(updateProgress);
                }
            };
            
            animationFrameId = requestAnimationFrame(updateProgress);
            
            // Set timeout for the delete action
            holdTimer = setTimeout(() => {
                console.log('Delete terminal button held for required time');
                this.handleDeleteTerminal();
                this.resetDeleteButton(deleteBtn, progressBar, countdownEl);
            }, HOLD_TIME);
        });
        
        // Handle mouse up - cancel if released too early
        const cancelDelete = () => {
            if (holdTimer !== null) {
                clearTimeout(holdTimer);
                holdTimer = null;
                
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                
                this.resetDeleteButton(deleteBtn, progressBar, countdownEl);
            }
        };
        
        deleteBtn.addEventListener('mouseup', cancelDelete);
        deleteBtn.addEventListener('mouseleave', cancelDelete);
        
        // Touch events for mobile support
        deleteBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Prevent accidental double-touches
            if (holdTimer !== null) return;
            
            holdStartTime = Date.now();
            deleteBtn.classList.add('delete-active');
            
            // Update the progress continuously
            const updateProgress = () => {
                const elapsed = Date.now() - holdStartTime;
                const percentage = Math.min(100, (elapsed / HOLD_TIME) * 100);
                
                this.updateDeleteProgress(progressBar, countdownEl, percentage, HOLD_TIME);
                
                if (percentage < 100) {
                    animationFrameId = requestAnimationFrame(updateProgress);
                }
            };
            
            animationFrameId = requestAnimationFrame(updateProgress);
            
            // Set timeout for the delete action
            holdTimer = setTimeout(() => {
                console.log('Delete terminal button held for required time');
                this.handleDeleteTerminal();
                this.resetDeleteButton(deleteBtn, progressBar, countdownEl);
            }, HOLD_TIME);
        });
        
        deleteBtn.addEventListener('touchend', cancelDelete);
        deleteBtn.addEventListener('touchcancel', cancelDelete);
    }
    
    /**
     * Update the delete button progress and countdown
     * @param {HTMLElement} progressBar - Progress bar element
     * @param {HTMLElement} countdownEl - Countdown text element
     * @param {number} percentage - Current percentage (0-100)
     * @param {number} totalTime - Total hold time in ms
     */
    updateDeleteProgress(progressBar, countdownEl, percentage, totalTime) {
        if (!progressBar || !countdownEl) return;
        
        // Update progress bar width
        progressBar.style.width = `${percentage}%`;
        
        // Update countdown text
        const remaining = Math.ceil((totalTime - (percentage * totalTime / 100)) / 1000);
        countdownEl.textContent = remaining <= 0 ? 'Deleting...' : `Hold ${remaining}s to delete...`;
    }
    
    /**
     * Reset the delete button state
     * @param {HTMLElement} button - Delete button element
     * @param {HTMLElement} progressBar - Progress bar element
     * @param {HTMLElement} countdownEl - Countdown text element
     */
    resetDeleteButton(button, progressBar, countdownEl) {
        if (button) button.classList.remove('delete-active');
        if (progressBar) progressBar.style.width = '0%';
        if (countdownEl) countdownEl.textContent = 'Hold to delete...';
    }
    
    /**
     * Handle the delete terminal button click
     */
    handleDeleteTerminal() {
        try {
            const portInput = document.getElementById('renameTerminalPort');
            
            if (!portInput || !portInput.value) {
                console.error('Missing port for terminal deletion');
                return;
            }
            
            const port = portInput.value;
            
            // Close the modal
            if (window.CommandWave && window.CommandWave.modalController) {
                window.CommandWave.modalController.closeModal('renameTerminalModal');
            } else {
                // Direct DOM manipulation fallback
                const modal = document.getElementById('renameTerminalModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
            
            // Delete the terminal
            this.deleteTerminal(port);
        } catch (error) {
            console.error('Error handling delete terminal:', error);
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
                this.showNewTerminalModal();
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
        } else {
            // Direct DOM manipulation fallback
            const modal = document.getElementById('newTerminalModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
        
        // Create the terminal
        this.createNewTerminal(terminalName);
    }
    
    /**
     * Switch to the specified terminal
     * @param {string} port - The port of the terminal to switch to
     */
    switchTerminal(port) {
        // Deactivate current terminal
        document.querySelectorAll('.tab-btn.active').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.terminal-iframe.active').forEach(iframe => {
            iframe.classList.remove('active');
        });
        
        // Activate selected terminal
        const selectedTab = document.querySelector(`.tab-btn[data-port="${port}"]`);
        const selectedIframe = document.querySelector(`.terminal-iframe[data-port="${port}"]`);
        
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        if (selectedIframe) {
            selectedIframe.classList.add('active');
        }
        
        this.activeTerminal = port;
        
        // Dispatch event for other components like NotesManager
        document.dispatchEvent(new CustomEvent('terminal-tab-changed', {
            detail: {
                port: port,
                name: selectedTab ? selectedTab.textContent : 'Terminal'
            }
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
            newTabBtn.setAttribute('data-name', name);
            newTabBtn.textContent = name;
            
            // Insert before the add tab button
            tabsContainer.insertBefore(newTabBtn, addTabBtn);
            
            // Add click event listener
            newTabBtn.addEventListener('click', () => {
                this.switchTerminal(port);
            });
            
            // Add double-click event listener for renaming
            newTabBtn.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openRenameTerminalModal(port, name);
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
    
    /**
     * Open the rename terminal modal
     * @param {string} port - Port of the terminal to rename
     * @param {string} currentName - Current terminal name
     */
    openRenameTerminalModal(port, currentName) {
        try {
            console.log(`Opening rename terminal modal for port ${port} with name ${currentName}`);
            
            // Set the hidden port field and current name
            const portInput = document.getElementById('renameTerminalPort');
            const nameInput = document.getElementById('renameTerminalName');
            
            if (portInput) {
                portInput.value = port;
            }
            
            if (nameInput) {
                // Strip any whitespace and use current name as default
                nameInput.value = currentName ? currentName.trim() : '';
            }
            
            // Show the modal
            if (window.CommandWave && window.CommandWave.modalController) {
                const result = window.CommandWave.modalController.openModal('renameTerminalModal');
                console.log('Opening renameTerminalModal, result:', result);
                
                // Focus the input field
                if (nameInput) {
                    setTimeout(() => {
                        nameInput.focus();
                        nameInput.select(); // Select all text for easy editing
                    }, 100);
                }
            } else {
                console.error('Modal controller not found');
                // Fallback - try to show the modal directly
                const modal = document.getElementById('renameTerminalModal');
                if (modal) {
                    modal.classList.add('active');
                    
                    // Focus the input field
                    if (nameInput) {
                        setTimeout(() => {
                            nameInput.focus();
                            nameInput.select(); // Select all text for easy editing
                        }, 100);
                    }
                }
            }
        } catch (error) {
            console.error('Error opening rename terminal modal:', error);
        }
    }
    
    /**
     * Handle the rename terminal form submission
     */
    handleRenameTerminal() {
        try {
            const portInput = document.getElementById('renameTerminalPort');
            const nameInput = document.getElementById('renameTerminalName');
            
            if (!portInput || !nameInput) {
                console.error('Missing required form elements for renaming terminal');
                return;
            }
            
            const port = portInput.value;
            let terminalName = 'Terminal';
            
            if (nameInput.value.trim()) {
                terminalName = nameInput.value.trim();
            }
            
            // Close the modal
            if (window.CommandWave && window.CommandWave.modalController) {
                window.CommandWave.modalController.closeModal('renameTerminalModal');
            } else {
                // Direct DOM manipulation fallback
                const modal = document.getElementById('renameTerminalModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
            
            // Rename the terminal
            this.renameTerminal(port, terminalName);
        } catch (error) {
            console.error('Error handling rename terminal:', error);
        }
    }
    
    /**
     * Delete a terminal
     * @param {string} port - The port of the terminal to delete
     */
    async deleteTerminal(port) {
        console.log(`Deleting terminal on port ${port}`);
        
        try {
            // Find the terminal tab and iframe
            const tab = document.querySelector(`.tab-btn[data-port="${port}"]`);
            const iframe = document.querySelector(`.terminal-iframe[data-port="${port}"]`);
            
            if (!tab || !iframe) {
                console.error(`Terminal with port ${port} not found for deletion`);
                return;
            }
            
            // Delete from the server first
            const serverDeleteResult = await this.deleteTerminalFromServer(port);
            
            // Continue with UI removal even if server delete fails
            if (!serverDeleteResult) {
                console.log(`Terminal server delete failed or not implemented - continuing with UI removal`);
            }
            
            // Remove from activePorts
            this.activePorts = this.activePorts.filter(p => p !== port);
            
            // Remove from UI
            tab.remove();
            iframe.remove();
            
            // If this was the active terminal, activate another one
            if (this.activeTerminal === port) {
                // Find another terminal to activate
                if (this.activePorts.length > 0) {
                    this.switchTerminal(this.activePorts[0]);
                } else {
                    this.activeTerminal = null;
                }
            }
            
            // Update local storage
            this.saveTerminalNames();
            
            console.log(`Terminal ${port} deleted successfully`);
        } catch (error) {
            console.error('Error deleting terminal:', error);
            this.showError(`Failed to delete terminal: ${error.message}`);
        }
    }
    
    /**
     * Delete terminal from the server
     * @param {string} port - The port of the terminal to delete
     */
    async deleteTerminalFromServer(port) {
        try {
            // Use the API module to delete from the server
            await terminalAPI.deleteTerminal(port);
            return true; // Successful API call or mock response
        } catch (error) {
            // Log error but don't throw - allow UI deletion to continue
            console.error('Error deleting terminal from server:', error);
            // We won't rethrow the error since the UI can still function without the server
            // This allows the terminal to be removed from the UI even if the server call fails
            return false;
        }
    }
    
    /**
     * Rename a terminal tab
     * @param {string} port - The port of the terminal to rename
     * @param {string} newName - The new name for the terminal
     */
    async renameTerminal(port, newName) {
        console.log(`Renaming terminal on port ${port} to "${newName}"`);
        
        try {
            // Update the tab button text
            const tab = document.querySelector(`.tab-btn[data-port="${port}"]`);
            if (tab) {
                tab.textContent = newName;
                
                // Store the name in a data attribute for persistence
                tab.setAttribute('data-name', newName);
                
                // Optionally, store tab names in localStorage for persistence across page reloads
                this.saveTerminalNames();
            } else {
                console.error(`Terminal tab with port ${port} not found`);
            }
            
            // Optionally, send the name update to the server
            const serverRenameResult = await this.updateTerminalNameOnServer(port, newName);
            
            if (!serverRenameResult) {
                console.log(`Terminal server rename failed or not implemented - continuing with UI rename`);
            }
        } catch (error) {
            console.error('Error renaming terminal:', error);
            this.showError(`Failed to rename terminal: ${error.message}`);
        }
    }
    
    /**
     * Update terminal name on the server (API call)
     * @param {string} port - The port of the terminal to rename
     * @param {string} newName - The new name for the terminal
     */
    async updateTerminalNameOnServer(port, newName) {
        try {
            // Use the API module to update the name on the server
            await terminalAPI.renameTerminal(port, newName);
            console.log(`Terminal name updated on server: ${port} -> ${newName}`);
            return true;
        } catch (error) {
            // Log error but don't throw - UI still functions without server
            console.error('Error updating terminal name on server:', error);
            // Non-critical error, so we don't show it to the user
            return false;
        }
    }
    
    /**
     * Save terminal names to localStorage for persistence
     */
    saveTerminalNames() {
        try {
            const terminalNames = {};
            
            // Collect all terminal names
            document.querySelectorAll('.tab-btn').forEach(tab => {
                if (tab.classList.contains('add-tab')) return; // Skip "add tab" button
                
                const port = tab.getAttribute('data-port');
                const name = tab.textContent;
                
                if (port && name) {
                    terminalNames[port] = name;
                }
            });
            
            // Save to localStorage
            localStorage.setItem('commandwave_terminal_names', JSON.stringify(terminalNames));
            console.log('Terminal names saved to localStorage');
        } catch (error) {
            console.error('Error saving terminal names:', error);
        }
    }
    
    /**
     * Load terminal names from localStorage
     */
    loadTerminalNames() {
        try {
            const savedNames = localStorage.getItem('commandwave_terminal_names');
            if (savedNames) {
                const terminalNames = JSON.parse(savedNames);
                
                // Apply names to tabs
                Object.entries(terminalNames).forEach(([port, name]) => {
                    const tab = document.querySelector(`.tab-btn[data-port="${port}"]`);
                    if (tab) {
                        tab.textContent = name;
                        tab.setAttribute('data-name', name);
                    }
                });
                
                console.log('Terminal names loaded from localStorage');
            }
        } catch (error) {
            console.error('Error loading terminal names:', error);
        }
    }
}
