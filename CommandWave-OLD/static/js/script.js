/**
 * CommandWave - Main JavaScript functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Custom error handler to suppress non-critical errors
    window.addEventListener('error', function(event) {
        // Check if it's a WebGL or non-critical error
        if (event.message && (
            event.message.includes('WebGL') || 
            event.message.includes('ReadPixels') || 
            event.message.includes('swiftshader')
        )) {
            // Prevent the error from appearing in console
            event.preventDefault();
            return true;
        }
    }, true);
    
    // Override console methods to filter out non-critical messages
    const originalConsoleError = console.error;
    console.error = function() {
        // Filter WebGL and ttyd related non-critical errors
        if (arguments.length > 0 && 
            typeof arguments[0] === 'string' && (
                arguments[0].includes('WebGL') || 
                arguments[0].includes('ReadPixels') ||
                arguments[0].includes('Failed to load resource: favicon')
            )) {
            return;
        }
        originalConsoleError.apply(console, arguments);
    };

    // Global state - make it accessible from window object
    window.state = {
        terminals: {
            // Example: 'terminal-7681': { port: 7681, name: 'Main', variables: {}, playbooks: {} }
        },
        activeTerminal: null,
        globalPlaybooks: {
            // Example: 'playbook1.md': { content: '', blocks: [] }
        },
        hostname: 'localhost' // Default to localhost, will be updated
    };

    // Get hostname from the DOM if available (set by Flask)
    const hostnameElement = document.getElementById('hostname');
    if (hostnameElement && hostnameElement.value) {
        window.state.hostname = hostnameElement.value;
    }

    // Initialize state with the default terminal
    const defaultTerminalElement = document.querySelector('.terminal-iframe');
    if (defaultTerminalElement) {
        const defaultPort = defaultTerminalElement.dataset.port;
        window.state.terminals[`terminal-${defaultPort}`] = {
            port: defaultPort,
            name: 'Main',
            variables: {},
            playbooks: {}
        };
        window.state.activeTerminal = `terminal-${defaultPort}`;

        // Initialize variables for the default terminal
        initializeVariables(window.state.activeTerminal);
        
        // Migrate any existing global playbooks to the default terminal for backward compatibility
        setTimeout(() => {
            migrateGlobalPlaybooks();
        }, 100);
    }

    // Load initial notes
    loadGlobalNotes();
    loadTabNotes(window.state.activeTerminal);

    // Terminal Tab Management
    const addTabBtn = document.getElementById('addTabBtn');
    if (addTabBtn) {
        addTabBtn.addEventListener('click', function(event) {
            event.preventDefault();
            openNewTerminalModal();
        });
    }

    // Setup tab switching
    setupTabSwitching();

    // Variable Input handling
    setupVariableInputs();

    // Setup terminal synchronization
    setupTerminalSync();

    // Setup playbook synchronization
    setupPlaybookSync();

    // Setup variable synchronization
    setupVariableSync();

    // Playbook upload
    const uploadPlaybookInput = document.getElementById('uploadPlaybook');
    if (uploadPlaybookInput) {
        uploadPlaybookInput.addEventListener('change', handlePlaybookUpload);
    }

    // Playbook search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handlePlaybookSearch, 500));
    }
    
    // Clear search button functionality
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
                const resultsContainer = document.getElementById('searchResults');
                if (resultsContainer) {
                    resultsContainer.style.display = 'none';
                }
            }
        });
    }

    // Notes panel toggles
    setupNotesPanel();

    // Setup custom variable functionality
    setupCustomVariables();

    // Setup create playbook functionality
    setupCreatePlaybook();

    // Settings dropdown functionality
    setupSettingsDropdown();

    // Setup modals
    setupModals();
    
    // Initialize theme
    initializeTheme();

    // Setup toggle functionality for the variables section
    setupVariablesToggle();

    // Setup terminal resize functionality
    setupTerminalResize();

    /**
     * Terminal Management Functions
     */
    
    function openNewTerminalModal() {
        // Get modal elements
        const modal = document.getElementById('newTerminalModal');
        const closeBtn = modal.querySelector('.close-modal-btn');
        const cancelBtn = document.getElementById('cancelTerminalBtn');
        const submitBtn = document.getElementById('createTerminalSubmitBtn');
        const nameInput = document.getElementById('newTerminalName');
        
        // Show modal
        modal.style.display = 'block';
        nameInput.focus();
        
        // Clear any existing event listeners
        submitBtn.replaceWith(submitBtn.cloneNode(true));
        const newSubmitBtn = document.getElementById('createTerminalSubmitBtn');
        nameInput.replaceWith(nameInput.cloneNode(true));
        const newNameInput = document.getElementById('newTerminalName');
        newNameInput.focus();
        
        // Close modal functions
        function closeModal() {
            modal.style.display = 'none';
            newNameInput.value = '';
            
            // Remove event listeners
            window.removeEventListener('click', windowClickHandler);
        }
        
        // Setup event listeners
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close when clicking outside of the modal content
        const windowClickHandler = function(event) {
            if (event.target === modal) {
                closeModal();
            }
        };
        window.addEventListener('click', windowClickHandler);
        
        // Handle form submission
        newSubmitBtn.addEventListener('click', submitHandler);
        
        function submitHandler() {
            const name = newNameInput.value.trim();
            
            if (!name) {
                showModal('themeModal', 'Please enter a name for the terminal');
                return;
            }
            
            // Create the terminal
            createTerminalWithName(name);
            
            // Close modal
            closeModal();
        }
        
        // Handle Enter key press
        newNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitHandler();
            }
        });
    }
    
    function createTerminalWithName(tabName) {
        if (!tabName) return;
        
        // Immediately store name to prevent browser prompt
        localStorage.setItem('new_terminal_name', tabName);

        fetch('/api/terminals/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: tabName
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const newPort = data.port;
                    const name = data.name || tabName;
                    
                    // Add the terminal tab to the UI
                    addTerminalTab(newPort, name);
                    
                    // Activate the new tab
                    const newTab = document.querySelector(`.tab-btn[data-port="${newPort}"]`);
                    if (newTab) {
                        activateTab(newTab);
                    }
                } else {
                    showErrorModal(data.error || 'Failed to create new terminal');
                }
            })
            .catch(error => {
                console.error('Error creating new terminal:', error);
                showErrorModal('Failed to create new terminal');
            });
    }
    
    function openRenameModal(tabElement, port, currentName) {
        // Create or use existing modal
        let modal = document.getElementById('renameModal');
        if (!modal) {
            modal = createRenameModal();
        }
        
        // Set the current port and name in the modal
        modal.dataset.port = port;
        const input = modal.querySelector('#terminalNameInput');
        if (input) {
            input.value = currentName || '';
            input.focus();
            input.select();
        }
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Close modal function
        openRenameModal.closeModal = function() {
            modal.style.display = 'none';
            document.removeEventListener('keyup', openRenameModal.escapeHandler);
            window.removeEventListener('click', openRenameModal.windowClickHandler);
        };
        
        // ESC key handler
        openRenameModal.escapeHandler = function(e) {
            if (e.key === 'Escape') {
                openRenameModal.closeModal();
            }
        };
        
        // Close when clicking outside
        openRenameModal.windowClickHandler = function(event) {
            if (event.target === modal) {
                openRenameModal.closeModal();
            }
        };
        
        // Handle rename
        openRenameModal.handleRename = function() {
            const newName = input.value.trim();
            if (newName) {
                // Update tab name in UI
                const tabContent = tabElement.querySelector('.tab-btn-content');
                if (tabContent) {
                    tabContent.textContent = newName;
                }
                
                // Update state
                const terminalId = `terminal-${port}`;
                if (window.state.terminals[terminalId]) {
                    window.state.terminals[terminalId].name = newName;
                }
                
                // Send rename request to server
                fetch(`/api/terminals/rename/${port}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: newName
                    })
                }).catch(error => {
                    console.error('Error renaming terminal:', error);
                });
            }
            
            openRenameModal.closeModal();
        };
        
        // Set up event handlers
        document.addEventListener('keyup', openRenameModal.escapeHandler);
        window.addEventListener('click', openRenameModal.windowClickHandler);
        
        // Add form submit handler
        const form = modal.querySelector('form');
        if (form) {
            form.onsubmit = function(e) {
                e.preventDefault();
                openRenameModal.handleRename();
            };
        }
        
        // Set up button handlers
        const submitButton = modal.querySelector('#renameTerminalSubmitBtn');
        if (submitButton) {
            submitButton.onclick = function() {
                openRenameModal.handleRename();
            };
        }
        
        const cancelButton = modal.querySelector('#cancelRenameBtn');
        if (cancelButton) {
            cancelButton.onclick = function() {
                openRenameModal.closeModal();
            };
        }
        
        const closeButton = modal.querySelector('.close-modal-btn');
        if (closeButton) {
            closeButton.onclick = function() {
                openRenameModal.closeModal();
            };
        }
    }
    
    function createRenameModal() {
        // Create modal element if it doesn't exist
        const modal = document.createElement('div');
        modal.id = 'renameModal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Rename Terminal</h3>
                    <button class="close-modal-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="form-group">
                            <label for="terminalNameInput">Terminal Name:</label>
                            <input type="text" id="terminalNameInput" class="modal-input">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button id="cancelRenameBtn" class="modal-btn cancel">Cancel</button>
                    <button id="renameTerminalSubmitBtn" class="modal-btn submit">Rename</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    function closeTerminal(port) {
        // Confirm with the user
        if (!confirm('Are you sure you want to close this terminal?')) {
            return;
        }
        
        // If this is the active terminal, switch to the default/first one
        if (window.state.activeTerminal === `terminal-${port}`) {
            const otherTabs = document.querySelectorAll('.tab-btn:not(.add-tab)');
            if (otherTabs.length > 1) {
                // Find a different tab to activate
                for (const tab of otherTabs) {
                    if (tab.dataset.port != port) {
                        activateTab(tab);
                        break;
                    }
                }
            }
        }
        
        // Remove from state and UI - handled by the polling sync
        // This will be removed when the server confirms deletion
        
        // Call API to close the terminal
        fetch(`/api/terminals/delete/${port}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`Terminal on port ${port} closed successfully`);
                
                // Remove from UI immediately for responsive user experience
                // The polling will sync this with other clients
                removeTerminalTab(port);
            } else {
                console.error(`Failed to close terminal on port ${port}:`, data.error);
                showModal('themeModal', `Failed to close terminal: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error(`Error closing terminal on port ${port}:`, error);
            showModal('themeModal', 'Failed to communicate with server');
        });
    }

    function setupTabSwitching() {
        document.querySelector('.terminal-tabs').addEventListener('click', function(e) {
            const clickedTab = e.target.closest('.tab-btn');
            if (clickedTab && !clickedTab.classList.contains('add-tab')) {
                activateTab(clickedTab);
            }
        });
    }

    function activateTab(tabElement) {
        // Deactivate all tabs and iframes
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.terminal-iframe').forEach(iframe => {
            iframe.classList.remove('active');
        });
        
        // Activate selected tab and iframe
        tabElement.classList.add('active');
        const port = tabElement.dataset.port;
        const iframe = document.getElementById(`terminal-${port}`);
        if (iframe) {
            iframe.classList.add('active');
            window.state.activeTerminal = iframe.id;
            
            // Update tab notes title and content
            const tabName = window.state.terminals[window.state.activeTerminal].name;
            const tabNameElement = document.getElementById('currentTabName');
            tabNameElement.textContent = tabName;
            tabNameElement.className = 'tab-name neon-pink';
            loadTabNotes(window.state.activeTerminal);
            
            // Refresh variable values
            updateVariableInputsFromState();
            
            // Display playbooks for the active terminal
            displayTerminalPlaybooks(window.state.activeTerminal);
        }
    }

    /**
     * Variable Management Functions
     */
    
    function initializeVariables(terminalId) {
        if (!window.state.terminals[terminalId].variables) {
            window.state.terminals[terminalId].variables = {};
        }
        
        // Initialize with empty values for all variable inputs
        document.querySelectorAll('.variable-input input').forEach(input => {
            const varName = input.id;
            if (!window.state.terminals[terminalId].variables[varName]) {
                window.state.terminals[terminalId].variables[varName] = {
                    title: input.placeholder,
                    name: varName,
                    value: ''
                };
            }
        });
        
        // Load saved variables from server
        loadVariablesFromServer(terminalId);
    }

    /**
     * Setup variable synchronization with server
     */
    function setupVariableSync() {
        // Start polling for variable updates periodically
        pollVariableUpdates();
        
        // Set up interval to poll for updates every 5 seconds
        setInterval(pollVariableUpdates, 5000);
    }

    /**
     * Poll for variable updates from other sessions
     */
    function pollVariableUpdates() {
        fetch('/api/variables/list/all')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateVariablesFromServer(data.variables);
                }
            })
            .catch(error => {
                console.error('Error polling variable updates:', error);
            });
    }

    /**
     * Update local variables from server data
     */
    function updateVariablesFromServer(serverVariables) {
        // If we have no active terminal, there's nothing to update
        if (!window.state.activeTerminal || !window.state.terminals[window.state.activeTerminal]) {
            return;
        }
        
        const activeTerminalId = window.state.activeTerminal;
        const terminalPort = window.state.terminals[activeTerminalId].port;
        const terminalIdForServer = `term-${terminalPort}`;
        
        // Check if server has variables for this terminal
        if (serverVariables[terminalIdForServer]) {
            const serverVars = serverVariables[terminalIdForServer];
            
            // Update local variables with server values if not being edited
            Object.keys(serverVars).forEach(varName => {
                // Skip if this variable is currently being edited
                const inputElement = document.querySelector(`input[name="${varName}"]`);
                if (inputElement && document.activeElement === inputElement) {
                    return;
                }
                
                // Update the variable in state
                if (!window.state.terminals[activeTerminalId].variables[varName] ||
                    window.state.terminals[activeTerminalId].variables[varName].value !== serverVars[varName].value) {
                    
                    // Update local state
                    window.state.terminals[activeTerminalId].variables[varName] = serverVars[varName];
                    
                    // Update UI if variable exists
                    if (inputElement) {
                        inputElement.value = serverVars[varName].value || '';
                    } else {
                        // Create variable UI if it doesn't exist
                        addCustomVariable(
                            serverVars[varName].title || varName,
                            serverVars[varName].name || `$${varName}`,
                            serverVars[varName].value || ''
                        );
                    }
                }
            });
            
            // Update substitutions in code blocks
            updateVariableSubstitutions();
        }
    }

    /**
     * Load variables from server for a terminal
     */
    function loadVariablesFromServer(terminalId) {
        if (!terminalId) return;
        
        const portMatch = terminalId.match(/^terminal-(\d+)$/);
        if (!portMatch) return;
        
        const port = portMatch[1];
        const terminalIdForServer = `term-${port}`;
        
        fetch(`/api/variables/load/${terminalIdForServer}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.variables) {
                    // Update local state with loaded variables
                    for (const [key, value] of Object.entries(data.variables)) {
                        window.state.terminals[terminalId].variables[key] = value;
                        
                        // Create UI for custom variables
                        if (!document.getElementById(`var-${key}`) && key !== 'targetIP' && 
                            key !== 'port' && key !== 'dcIP' && key !== 'userFile' && 
                            key !== 'passFile' && key !== 'wordlist' && key !== 'controlSocket') {
                            addCustomVariable(value.title, value.name, value.value);
                        }
                    }
                    
                    // Update input values
                    updateVariableInputsFromState();
                    
                    // Update code blocks with substitutions
                    updateVariableSubstitutions();
                    
                    console.log(`Loaded variables for terminal ${terminalId}`);
                }
            })
            .catch(error => {
                console.error(`Error loading variables for terminal ${terminalId}:`, error);
            });
    }

    /**
     * Sync variables to server
     */
    function syncVariablesToServer() {
        if (!window.state.activeTerminal || !window.state.terminals[window.state.activeTerminal]) {
            return;
        }
        
        const activeTerminalId = window.state.activeTerminal;
        const terminalPort = window.state.terminals[activeTerminalId].port;
        const terminalIdForServer = `term-${terminalPort}`;
        
        // Get variables from state
        const variablesToSync = window.state.terminals[activeTerminalId].variables;
        
        // Send to server
        fetch(`/api/variables/sync/${terminalIdForServer}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variables: variablesToSync
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Variables synced successfully');
            } else {
                console.error('Error syncing variables:', data.error);
            }
        })
        .catch(error => {
            console.error('Error syncing variables:', error);
        });
    }

    function setupVariableInputs() {
        // Variable input handler
        document.getElementById('addVariableInput').addEventListener('click', function() {
            openNewVariableModal();
        });
        
        // Initial variables setup
        initializeVariables('terminal-' + document.querySelector('.tab-btn.active').dataset.port);
        
        document.querySelectorAll('.variable-input input').forEach(input => {
            input.addEventListener('input', function() {
                if (window.state.activeTerminal) {
                    window.state.terminals[window.state.activeTerminal].variables[this.name].value = this.value;
                    updateVariableSubstitutions();
                    
                    // Sync variables to server after a short delay for typing
                    clearTimeout(input.syncTimeout);
                    input.syncTimeout = setTimeout(syncVariablesToServer, 1000);
                }
            });
        });
        
        // Add functionality for remove buttons
        document.querySelectorAll('.variable-input .remove-variable-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const varInput = this.closest('.variable-input');
                if (varInput && window.state.activeTerminal) {
                    const varName = varInput.querySelector('input').name;
                    const displayName = varInput.querySelector('label').textContent;
                    if (confirm(`Remove ${displayName} variable?`)) {
                        delete window.state.terminals[window.state.activeTerminal].variables[varName];
                        varInput.remove();
                        updateVariableSubstitutions();
                        syncVariablesToServer();
                    }
                }
            });
        });
    }

    function updateVariableInputsFromState() {
        if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
            const variables = window.state.terminals[window.state.activeTerminal].variables;
            
            document.querySelectorAll('.variable-input input').forEach(input => {
                const varName = input.name;
                if (variables[varName]) {
                    input.value = variables[varName].value;
                } else {
                    input.value = '';
                }
            });
        }
    }

    function updateVariableSubstitutions() {
        if (!window.state.activeTerminal) return;
        
        const variables = window.state.terminals[window.state.activeTerminal].variables;
        document.querySelectorAll('.code-container pre code').forEach(codeBlock => {
            // Get the raw code
            let content = codeBlock.dataset.rawCode || codeBlock.textContent;
            
            // Perform variable substitution
            for (const [key, value] of Object.entries(variables)) {
                if (value.value) {
                    // Convert variable name to match the format in the playbooks
                    // For example, 'targetIP' becomes '$TargetIP'
                    const placeholder = '$' + key.charAt(0).toUpperCase() + key.slice(1);
                    const regex = new RegExp(escapeRegExp(placeholder), 'g');
                    content = content.replace(regex, `<span class="substituted">${value.value}</span>`);
                }
            }
            
            // Update the HTML with substitutions
            codeBlock.innerHTML = content;
            
            // Re-apply Prism.js highlighting
            Prism.highlightElement(codeBlock);
        });
    }

    function getSubstitutedCode(codeElement) {
        if (!window.state.activeTerminal) return codeElement.textContent;
        
        const variables = window.state.terminals[window.state.activeTerminal].variables;
        let content = codeElement.dataset.rawCode || codeElement.textContent;
        
        // Perform variable substitution
        for (const [key, value] of Object.entries(variables)) {
            if (value.value) {
                // Convert variable name to match the format in the playbooks
                const placeholder = '$' + key.charAt(0).toUpperCase() + key.slice(1);
                const regex = new RegExp(escapeRegExp(placeholder), 'g');
                content = content.replace(regex, value.value);
            }
        }
        
        return content;
    }

    function openNewVariableModal() {
        // Get modal elements
        const modal = document.getElementById('newVariableModal');
        const closeBtn = modal.querySelector('.close-modal-btn');
        const cancelBtn = document.getElementById('cancelVariableBtn');
        const submitBtn = document.getElementById('createVariableSubmitBtn');
        const titleInput = document.getElementById('newVariableTitle');
        const nameInput = document.getElementById('newVariableName');
        const valueInput = document.getElementById('newVariableValue');
        
        // Show modal
        modal.style.display = 'block';
        titleInput.focus();
        
        // Clear any previous event listeners by cloning and replacing elements
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Use the new references for all event listeners
        const modalCloseBtn = document.querySelector('#newVariableModal .close-modal-btn');
        const modalCancelBtn = document.getElementById('cancelVariableBtn');
        const modalSubmitBtn = document.getElementById('createVariableSubmitBtn');
        
        // Close modal functions
        function closeModal() {
            modal.style.display = 'none';
            titleInput.value = '';
            nameInput.value = '';
            valueInput.value = '';
            // Remove outside click handler when modal is closed
            window.removeEventListener('click', windowClickHandler);
        }
        
        // Close when clicking outside of the modal content
        function windowClickHandler(event) {
            if (event.target === modal) {
                closeModal();
            }
        }
        
        // Setup event listeners
        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        window.addEventListener('click', windowClickHandler);
        
        // Handle form submission
        modalSubmitBtn.addEventListener('click', function() {
            const title = titleInput.value.trim();
            let varName = nameInput.value.trim();
            const value = valueInput.value.trim();
            
            if (!title) {
                showErrorModal('Please enter a title for the variable');
                return;
            }
            
            if (!varName) {
                showErrorModal('Please enter a variable reference');
                return;
            }
            
            // Check for spaces in the variable name
            if (varName.includes(' ')) {
                showErrorModal('Variable reference cannot contain spaces. Use camelCase or snake_case instead.');
                return;
            }
            
            // Add $ prefix if it's not already there
            if (!varName.startsWith('$')) {
                varName = '$' + varName;
            }
            
            // Create the variable
            addCustomVariable(title, varName, value);
            
            // Close modal
            closeModal();
        });
        
        // Handle Enter key press
        valueInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                modalSubmitBtn.click();
            }
        });
    }
    
    function addCustomVariable(title, name, value = '') {
        if (!window.state.activeTerminal || !name) return;
        
        // Add to state - store both title and name
        const varKey = name.replace(/^\$/, ''); // Strip $ for state storage
        window.state.terminals[window.state.activeTerminal].variables[varKey] = {
            title: title,
            name: name,
            value: value
        };
        
        // Create variable input row
        const varContainer = document.querySelector('.variable-inputs');
        
        // Check if variable already exists
        const existingVar = document.getElementById(`var-${varKey}`);
        if (existingVar) {
            // Update the value
            existingVar.querySelector('input').value = value;
            // Also sync to server
            syncVariablesToServer();
            return;
        }
        
        // Create new variable input
        const varInput = document.createElement('div');
        varInput.className = 'variable-input custom-variable';
        varInput.id = `var-${varKey}`;
        
        varInput.innerHTML = `
            <label for="var-input-${varKey}">${title}:</label>
            <input type="text" id="var-input-${varKey}" name="${varKey}" placeholder="${name}" value="${value || ''}">
            <button class="remove-variable-btn" title="Remove variable">&times;</button>
        `;
        
        // Add event listener to remove button
        varInput.querySelector('.remove-variable-btn').addEventListener('click', function() {
            const varName = varInput.querySelector('input').name;
            const displayName = varInput.querySelector('label').textContent;
            if (confirm(`Remove ${displayName} variable?`)) {
                varInput.remove();
                delete window.state.terminals[window.state.activeTerminal].variables[varName];
                updateVariableSubstitutions();
                syncVariablesToServer();
            }
        });
        
        // Add event listener to input
        varInput.querySelector('input').addEventListener('input', function() {
            window.state.terminals[window.state.activeTerminal].variables[this.name].value = this.value;
            updateVariableSubstitutions();
            
            // Sync variables to server after a short delay for typing
            clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(syncVariablesToServer, 1000);
        });
        
        // Add to container
        varContainer.appendChild(varInput);
        
        // Update any code that might use this variable
        updateVariableSubstitutions();
        
        // Sync to server
        syncVariablesToServer();
    }

    /**
     * Terminal synchronization functionality
     */
    
    function setupTerminalSync() {
        // Start polling for terminal updates
        pollTerminalUpdates();
        
        // Set up interval to poll for updates every 5 seconds
        setInterval(pollTerminalUpdates, 5000);
    }

    function pollTerminalUpdates() {
        fetch('/api/terminals/list')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateTerminalTabs(data.terminals);
                }
            })
            .catch(error => {
                console.error('Error polling terminal updates:', error);
            });
    }

    function updateTerminalTabs(serverTerminals) {
        // Get current client-side terminals
        const clientTerminals = Object.keys(window.state.terminals).map(key => {
            const terminalInfo = window.state.terminals[key];
            return {
                port: terminalInfo.port,
                name: terminalInfo.name
            };
        });
        
        // Find terminals that exist on server but not in client
        const terminalsToAdd = serverTerminals.filter(serverTerminal => 
            !clientTerminals.some(clientTerminal => 
                clientTerminal.port == serverTerminal.port
            )
        );
        
        // Add new terminals
        terminalsToAdd.forEach(terminal => {
            addTerminalTab(terminal.port, terminal.name);
        });
        
        // Update names of existing terminals if they've changed
        serverTerminals.forEach(serverTerminal => {
            const clientTerminalKey = `terminal-${serverTerminal.port}`;
            if (window.state.terminals[clientTerminalKey] && 
                window.state.terminals[clientTerminalKey].name !== serverTerminal.name) {
                updateTerminalName(serverTerminal.port, serverTerminal.name);
            }
        });
        
        // Find terminals that exist in client but not on server (deleted on another client)
        const terminalsToRemove = clientTerminals.filter(clientTerminal => 
            !serverTerminals.some(serverTerminal => 
                serverTerminal.port == clientTerminal.port
            )
        );
        
        // Remove deleted terminals (except active one)
        terminalsToRemove.forEach(terminal => {
            if (window.state.activeTerminal !== `terminal-${terminal.port}`) {
                removeTerminalTab(terminal.port);
            }
        });
    }

    function addTerminalTab(port, name) {
        // Check if tab already exists
        if (document.querySelector(`.tab-btn[data-port="${port}"]`)) {
            return;
        }
        
        // Create new tab button
        const tabsContainer = document.querySelector('.terminal-tabs');
        const newTab = document.createElement('button');
        newTab.className = 'tab-btn';
        newTab.dataset.port = port;
        
        // Separate span for content and close button
        const tabContent = document.createElement('span');
        tabContent.className = 'tab-btn-content';
        tabContent.textContent = name;
        newTab.appendChild(tabContent);
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeTerminal(port);
        });
        
        newTab.appendChild(closeBtn);
        
        // Add double-click for rename
        newTab.addEventListener('dblclick', function(e) {
            if (e.target === this) {
                openRenameModal(this, port, name);
            }
        });
        
        // Add tab button before the add-tab button
        const addTabBtn = document.querySelector('.add-tab');
        tabsContainer.insertBefore(newTab, addTabBtn);
        
        // Create iframe
        const terminalsContainer = document.querySelector('.terminal-container');
        const iframe = document.createElement('iframe');
        iframe.id = `terminal-${port}`;
        iframe.className = 'terminal-iframe';
        iframe.src = `http://${window.state.hostname}:${port}`;
        iframe.dataset.port = port;
        
        terminalsContainer.appendChild(iframe);
        
        // Update state
        window.state.terminals[`terminal-${port}`] = {
            port,
            name,
            variables: {},
            playbooks: {}
        };
        
        // Initialize variables for the new terminal
        initializeVariables(`terminal-${port}`);
    }

    function removeTerminalTab(port) {
        // Remove the tab button
        const tabBtn = document.querySelector(`.tab-btn[data-port="${port}"]`);
        if (tabBtn) {
            tabBtn.remove();
        }
        
        // Remove the iframe
        const iframe = document.getElementById(`terminal-${port}`);
        if (iframe) {
            iframe.remove();
        }
        
        // Update state
        delete window.state.terminals[`terminal-${port}`];
        
        // If this was the active terminal, switch to the first available
        if (window.state.activeTerminal === `terminal-${port}`) {
            const firstTab = document.querySelector('.tab-btn:not(.add-tab)');
            if (firstTab) {
                activateTab(firstTab);
            }
        }
    }

    function updateTerminalName(port, name) {
        // Update the tab button content
        const tabBtn = document.querySelector(`.tab-btn[data-port="${port}"] .tab-btn-content`);
        if (tabBtn) {
            tabBtn.textContent = name;
        }
        
        // Update state
        if (window.state.terminals[`terminal-${port}`]) {
            window.state.terminals[`terminal-${port}`].name = name;
        }
    }

    /**
     * Playbook synchronization functionality
     */
    
    function setupPlaybookSync() {
        // Start polling for playbook updates
        pollPlaybookUpdates();
        
        // Set up interval to poll for updates every 5 seconds
        setInterval(pollPlaybookUpdates, 5000);
    }
    
    function pollPlaybookUpdates() {
        fetch('/api/playbooks/list/all')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updatePlaybooks(data.playbooks);
                }
            })
            .catch(error => {
                console.error('Error polling playbook updates:', error);
            });
    }
    
    function updatePlaybooks(serverPlaybooks) {
        // If we have no active terminal, there's nothing to update
        if (!window.state.activeTerminal || !window.state.terminals[window.state.activeTerminal]) {
            return;
        }
        
        const activeTerminalId = window.state.activeTerminal;
        const activeTerminalPlaybooks = window.state.terminals[activeTerminalId].playbooks;
        const terminalPort = window.state.terminals[activeTerminalId].port;
        const currentTerminalId = `term-${terminalPort}`;
        
        // Process each server playbook
        Object.keys(serverPlaybooks).forEach(filename => {
            const serverPlaybook = serverPlaybooks[filename];
            const sanitizedFilename = sanitizeForCssClass(filename);
            
            // Check if this playbook belongs to this terminal
            const playbookTerminalId = serverPlaybook.terminal_id || 'unknown';
            
            // Only process playbooks that belong to this terminal or have no terminal association
            if (playbookTerminalId === currentTerminalId || playbookTerminalId === 'unknown') {
                // If playbook exists locally but content differs, update the local copy
                if (activeTerminalPlaybooks[filename]) {
                    // Skip if this client is currently editing the playbook
                    if (document.querySelector(`.playbook-editing-${sanitizedFilename}`)) {
                        return;
                    }
                    
                    // Compare last_modified timestamps to detect newer content
                    const clientLastModified = activeTerminalPlaybooks[filename].last_modified || 0;
                    const serverLastModified = serverPlaybook.last_modified || 0;
                    
                    // Only update if server version is newer
                    if (serverLastModified > clientLastModified) {
                        console.log(`Updating playbook: ${filename} from server`);
                        
                        // Update the state
                        activeTerminalPlaybooks[filename] = {
                            filename: filename,
                            content: serverPlaybook.content,
                            blocks: parseMarkdown(serverPlaybook.content),
                            last_modified: serverPlaybook.last_modified,
                            editor: serverPlaybook.editor,
                            terminal_id: playbookTerminalId
                        };
                        
                        // Update the UI if the playbook is currently displayed
                        const playbackContainer = document.getElementById(`playbook-${sanitizedFilename}`);
                        if (playbackContainer) {
                            // Temporarily show sync indicator
                            const header = playbackContainer.querySelector('.playbook-header');
                            if (header) {
                                const syncIndicator = document.createElement('span');
                                syncIndicator.className = 'sync-indicator';
                                syncIndicator.textContent = '(Syncing...)';
                                header.appendChild(syncIndicator);
                                
                                // Remove the indicator after 2 seconds
                                setTimeout(() => {
                                    syncIndicator.remove();
                                }, 2000);
                            }
                            
                            // Update the content
                            displayPlaybook(activeTerminalPlaybooks[filename], activeTerminalId);
                        }
                    }
                } else {
                    // New playbook from server, add it locally
                    console.log(`New playbook from server: ${filename}`);
                    
                    // Add to state
                    activeTerminalPlaybooks[filename] = {
                        filename: filename,
                        content: serverPlaybook.content,
                        blocks: parseMarkdown(serverPlaybook.content),
                        last_modified: serverPlaybook.last_modified,
                        editor: serverPlaybook.editor,
                        terminal_id: playbookTerminalId
                    };
                    
                    // Display it if current playbooks section is visible
                    if (document.getElementById('playbooks').children.length > 0) {
                        displayPlaybook(activeTerminalPlaybooks[filename], activeTerminalId);
                    }
                }
            }
        });
    }

    /**
     * Playbook Management Functions
     */
    
    function handlePlaybookUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Ensure we have an active terminal
        if (!window.state.activeTerminal || !window.state.terminals[window.state.activeTerminal]) {
            console.error('No active terminal for playbook upload');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const activeTerminalId = window.state.activeTerminal;
            const terminalPort = window.state.terminals[activeTerminalId].port;
            
            const playbook = {
                filename: file.name,
                content: content,
                blocks: parseMarkdown(content),
                last_modified: Date.now() / 1000, // Add timestamp for synchronization
                editor: 'client',  // Add editor information
                terminal_id: `term-${terminalPort}` // Associate with current terminal
            };
            
            // Store in active terminal's playbooks
            window.state.terminals[activeTerminalId].playbooks[file.name] = playbook;
            
            // Sync to server with terminal ID
            fetch(`/api/playbooks/sync/${encodeURIComponent(file.name)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    editor: 'client',
                    terminal_id: `term-${terminalPort}` // Include terminal ID
                })
            }).catch(error => {
                console.error('Error syncing uploaded playbook:', error);
            });
            
            // Display the playbook
            displayPlaybook(playbook);
            
            // Reset the file input
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }

    /**
     * Parse Markdown content into structured blocks
     * @param {string} content - Raw Markdown content
     * @return {Array} - Array of code blocks and text blocks
     */
    window.parseMarkdown = function(content) {
        // Configure marked.js to open all links in new tabs and prevent navigation away
        marked.setOptions({
            renderer: (function() {
                const renderer = new marked.Renderer();
                // Override link renderer to add target="_blank" and rel attributes
                renderer.link = function(href, title, text) {
                    // Check if it's an explicit playbook reference link (starts with playbook:)
                    if (href.startsWith('playbook:')) {
                        // Extract the playbook name from the href
                        const playbookName = href.substring(9); // Remove 'playbook:' prefix
                        
                        // Create a special playbook reference link
                        return `<a href="javascript:void(0)" 
                            onclick="window.importPlaybook('${playbookName}')" 
                            class="playbook-reference" 
                            title="${title || 'Open playbook: ' + playbookName}"
                            data-playbook="${playbookName}">
                            <i class="fas fa-book-open"></i> ${text}
                        </a>`;
                    }
                    // Check if it's an internal markdown link (no http/https)
                    else if (!href.startsWith('http') && href.endsWith('.md')) {
                        // It's an internal markdown file link - handle with importPlaybook
                        return `<a href="javascript:void(0)" onclick="window.importPlaybook('${href}')" title="${title || 'Open playbook'}">${text}</a>`;
                    } else {
                        // External link - open in new tab
                        return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
                    }
                };
                return renderer;
            })()
        });
        
        // Use marked.js to parse the Markdown
        const tokens = marked.lexer(content);
        const blocks = [];
        let currentTextBlock = '';
        
        tokens.forEach(token => {
            if (token.type === 'code') {
                // If we have accumulated text, add it as a block first
                if (currentTextBlock) {
                    blocks.push({
                        type: 'text',
                        content: currentTextBlock
                    });
                    currentTextBlock = '';
                }
                
                // Add the code block
                blocks.push({
                    type: 'code',
                    language: token.lang || '',
                    content: token.text
                });
            } else {
                // For other token types, accumulate them into a text block
                const html = marked.parser([token]);
                currentTextBlock += html;
            }
        });
        
        // Add any remaining text block
        if (currentTextBlock) {
            blocks.push({
                type: 'text',
                content: currentTextBlock
            });
        }
        
        return blocks;
    }

    /**
     * Display a playbook in the interface
     * @param {Object} playbook - The playbook object
     * @param {string} terminalId - Optional terminal ID
     */
    window.displayPlaybook = function(playbook, terminalId) {
        const playbooksContainer = document.getElementById('playbooks');
        if (!playbooksContainer) return;
        
        // Use the active terminal if no specific terminal ID provided
        const targetTerminal = terminalId || window.state.activeTerminal;
        if (!targetTerminal) return;
        
        // Create a unique ID for the playbook within this terminal context
        const playbookId = `${targetTerminal}-${playbook.filename.replace(/\s+/g, '-').replace(/\./g, '-')}`;
        
        // Check if this playbook is already displayed
        if (document.getElementById(`playbook-${playbookId}`)) {
            return;
        }
        
        // Create playbook container
        const playbookElement = createPlaybookContainer(playbookId, playbook.filename);
        
        // Create content area
        const content = playbookElement.querySelector('.playbook-content');
        
        // Populate with blocks
        playbook.blocks.forEach((block, blockIndex) => {
            if (block.type === 'text') {
                const textBlock = document.createElement('div');
                textBlock.className = 'markdown-block markdown-text';
                textBlock.innerHTML = block.content;
                content.appendChild(textBlock);
            } else if (block.type === 'code') {
                const codeBlock = document.createElement('div');
                codeBlock.className = 'markdown-block code-block';
                codeBlock.innerHTML = `
                    <div class="code-header">
                        <button class="code-action-btn copy" title="Copy to clipboard"><i class="fas fa-copy"></i> Copy</button>
                        <button class="code-action-btn execute" title="Execute in current terminal"><i class="fas fa-play"></i> Execute</button>
                    </div>
                    <div class="code-container" data-block-index="${blockIndex}" data-playbook-id="${playbookId}">
                        <pre><code class="language-${block.language}">${block.content}</code></pre>
                    </div>
                `;
                
                // Store the raw code for variable substitution
                const codeElement = codeBlock.querySelector('code');
                codeElement.dataset.rawCode = block.content;
                
                // Set up copy button
                const copyBtn = codeBlock.querySelector('.copy');
                copyBtn.addEventListener('click', function() {
                    copyToClipboard(getSubstitutedCode(codeElement));
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
                });
                
                // Set up execute button
                const executeBtn = codeBlock.querySelector('.execute');
                executeBtn.addEventListener('click', function() {
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
                    executeCode(getSubstitutedCode(codeElement))
                        .then(() => {
                            this.innerHTML = '<i class="fas fa-check"></i> Done!';
                            setTimeout(() => {
                                this.innerHTML = '<i class="fas fa-play"></i> Execute';
                            }, 2000);
                        })
                        .catch(() => {
                            this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                            setTimeout(() => {
                                this.innerHTML = '<i class="fas fa-play"></i> Execute';
                            }, 2000);
                        });
                });
                
                // Set up double-click to edit
                const codeContainer = codeBlock.querySelector('.code-container');
                codeContainer.addEventListener('dblclick', function() {
                    editCodeBlock(this, blockIndex, playbook);
                });
                
                content.appendChild(codeBlock);
            }
        });
        
        // Add to document
        playbooksContainer.appendChild(playbookElement);
        
        // Add event listener for remove button
        playbookElement.querySelector('.remove-playbook').addEventListener('click', function() {
            playbookElement.remove();
            
            // Delete from terminal's playbooks or global playbooks
            if (playbook.filename in window.state.terminals[targetTerminal].playbooks) {
                delete window.state.terminals[targetTerminal].playbooks[playbook.filename];
            } else if (playbook.filename in window.state.globalPlaybooks) {
                delete window.state.globalPlaybooks[playbook.filename];
            }
        });
        
        // Apply variable substitutions
        updateVariableSubstitutions();
        
        // Apply syntax highlighting
        Prism.highlightAllUnder(playbookElement);
    }

    function createPlaybookContainer(name, title) {
        const playbookContainer = document.createElement('div');
        playbookContainer.className = 'playbook-container';
        // Sanitize the name for use as an ID
        const sanitizedName = sanitizeForCssClass(name);
        playbookContainer.id = `playbook-${sanitizedName}`;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'playbook-header';
        
        // Create dropdown indicator (just one)
        const dropdownIndicator = document.createElement('span');
        dropdownIndicator.className = 'dropdown-indicator';
        dropdownIndicator.textContent = '▼'; // Down arrow for collapsed state
        
        // Create title
        const titleElement = document.createElement('h3');
        titleElement.className = 'playbook-title';
        titleElement.textContent = title;
        
        // Create actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'playbook-actions';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'playbook-action-btn remove-playbook';
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Remove playbook';
        
        // Assemble header - only add one dropdown indicator
        header.appendChild(dropdownIndicator);
        header.appendChild(titleElement);
        header.appendChild(actionsContainer);
        actionsContainer.appendChild(closeButton);
        
        // Create content area
        const content = document.createElement('div');
        content.className = 'playbook-content collapsed'; // Start collapsed
        
        // Assemble container
        playbookContainer.appendChild(header);
        playbookContainer.appendChild(content);
        
        // Add event listeners
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent triggering header click
            playbookContainer.remove();
            delete window.state.globalPlaybooks[name];
        });
        
        // Add event listener to header for toggling content
        header.addEventListener('click', function() {
            content.classList.toggle('collapsed');
            const indicator = this.querySelector('.dropdown-indicator');
            if (indicator) {
                indicator.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
            }
        });
        
        return playbookContainer;
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Find the button that triggered the copy and show visual feedback
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    const originalText = activeButton.textContent;
                    const originalClass = activeButton.className;
                    
                    // Change button text and add success class
                    activeButton.textContent = 'Copied!';
                    activeButton.className = 'code-action-btn copy-success';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = originalText;
                        activeButton.className = originalClass;
                    }, 1500);
                }
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                
                // Visual indication of failure
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    const originalText = activeButton.textContent;
                    const originalClass = activeButton.className;
                    
                    // Change button text and add failure class
                    activeButton.textContent = 'Failed!';
                    activeButton.className = 'code-action-btn copy-fail';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = originalText;
                        activeButton.className = originalClass;
                    }, 1500);
                }
            });
    }

    function executeCode(code) {
        if (!window.state.activeTerminal) return;
        
        const port = window.state.terminals[window.state.activeTerminal].port;
        
        // Find the button that triggered the execution and show visual feedback
        const activeButton = document.activeElement;
        if (activeButton && activeButton.classList.contains('code-action-btn')) {
            const originalText = activeButton.textContent;
            const originalClass = activeButton.className;
            
            // Change button text and add progress class
            activeButton.textContent = 'Executing...';
            activeButton.className = 'code-action-btn execute-progress';
        }
        
        fetch('/api/terminals/sendkeys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                port: port,
                keys: code
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to execute code:', data.error);
                
                // Show failure feedback if we have the active button
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    activeButton.textContent = 'Failed!';
                    activeButton.className = 'code-action-btn execute-fail';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = 'Execute';
                        activeButton.className = 'code-action-btn execute';
                    }, 1500);
                }
            } else {
                // Show success feedback if we have the active button
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    activeButton.textContent = 'Executed!';
                    activeButton.className = 'code-action-btn execute-success';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = 'Execute';
                        activeButton.className = 'code-action-btn execute';
                    }, 1500);
                }
            }
        })
        .catch(error => {
            console.error('Error executing code:', error);
            
            // Show failure feedback if we have the active button
            const activeButton = document.activeElement;
            if (activeButton && activeButton.classList.contains('code-action-btn')) {
                activeButton.textContent = 'Failed!';
                activeButton.className = 'code-action-btn execute-fail';
                
                // Reset button after 1.5 seconds
                setTimeout(() => {
                    activeButton.textContent = 'Execute';
                    activeButton.className = 'code-action-btn execute';
                }, 1500);
            }
        });
    }

    function editCodeBlock(codeContainer, blockIndex, playbook) {
        // Get the playbook from active terminal's state
        const activeTerminal = window.state.activeTerminal;
        if (!activeTerminal) return;
        
        // Extract the actual playbook filename from the playbook-id (format: terminal-id-playbook-name)
        let playbookFilename;
        if (typeof playbook === 'object') {
            playbookFilename = playbook.filename;
        } else if (typeof playbook === 'string') {
            if (playbook.includes('-')) {
                playbookFilename = playbook.split('-').slice(1).join('-');
            } else {
                playbookFilename = playbook;
            }
        } else {
            console.error('Invalid playbook identifier:', playbook);
            return;
        }
        
        // Get the playbook data from state
        const playbookData = window.state.terminals[activeTerminal].playbooks[playbookFilename];
        if (!playbookData) {
            console.error(`Playbook ${playbookFilename} not found in state`);
            return;
        }
        
        // Get the code element to edit
        const codeBlock = codeContainer.querySelector('pre');
        if (!codeBlock) return;
        
        const codeElement = codeBlock.querySelector('code');
        if (!codeElement) return;
        
        // Store the original content for restoration
        const originalContent = codeElement.dataset.rawCode || codeElement.textContent;
        
        // Create a textarea for editing
        const textarea = document.createElement('textarea');
        textarea.className = 'code-textarea';
        textarea.value = playbookData.blocks[blockIndex].content;
        
        // Sanitize the filename for use as a CSS class
        const sanitizedFilename = sanitizeForCssClass(playbookFilename);
        
        // Add class to the playbook container to indicate it's being edited
        const playbookContainer = codeContainer.closest('.playbook-container');
        if (playbookContainer) {
            playbookContainer.classList.add(`playbook-editing-${sanitizedFilename}`);
        }
        
        // Store the original code block for restoration if needed
        const originalCodeBlock = codeBlock.cloneNode(true);
        
        // Replace the code with the textarea
        codeContainer.replaceChild(textarea, codeBlock);
        
        // Function to save the edited code
        function saveEdit() {
            const newCode = textarea.value;
            
            // Update the state
            playbookData.blocks[blockIndex].content = newCode;
            
            // Create new pre and code elements
            const newPre = document.createElement('pre');
            const newCodeElement = document.createElement('code');
            newCodeElement.className = codeElement.className;
            newCodeElement.textContent = newCode;
            newCodeElement.dataset.rawCode = newCode;
            
            newPre.appendChild(newCodeElement);
            
            // Replace the textarea with the pre element
            codeContainer.replaceChild(newPre, textarea);
            
            // Update the raw content of the playbook by reconstructing from blocks
            const updatedContent = playbookData.blocks.map(block => {
                if (block.type === 'code') {
                    return '```' + (block.language || '') + '\n' + block.content + '\n```';
                } else {
                    return block.content;
                }
            }).join('\n\n');
            
            // Update playbook content and add timestamp for synchronization
            playbookData.content = updatedContent;
            playbookData.last_modified = Date.now() / 1000; // Use seconds for consistency with server
            playbookData.editor = 'client'; // Mark as edited by this client
            
            // Extract terminal ID without the "terminal-" prefix
            const terminalPort = window.state.terminals[activeTerminal].port;
            
            // Sync to server
            fetch(`/api/playbooks/sync/${encodeURIComponent(playbookFilename)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: updatedContent,
                    editor: 'client',
                    terminal_id: `term-${terminalPort}` // Include terminal ID
                })
            }).catch(error => {
                console.error('Error syncing playbook edit:', error);
            });
            
            // Remove editing class from container
            if (playbookContainer) {
                playbookContainer.classList.remove(`playbook-editing-${sanitizedFilename}`);
            }
            
            // Re-apply syntax highlighting
            Prism.highlightElement(newCodeElement);
            
            // Update code action buttons
            const codeBlock = codeContainer.querySelector('pre');
            if (codeBlock) {
                // Copy button
                const oldCopyBtn = codeBlock.querySelector('.copy');
                if (oldCopyBtn) {
                    const newCopyBtn = document.createElement('button');
                    newCopyBtn.className = 'code-action-btn copy';
                    newCopyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    newCopyBtn.addEventListener('click', function() {
                        copyToClipboard(getSubstitutedCode(newCodeElement));
                        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
                    });
                    
                    // Replace the old button
                    oldCopyBtn.parentNode.replaceChild(newCopyBtn, oldCopyBtn);
                }
                
                // Execute button
                const oldExecuteBtn = codeBlock.querySelector('.execute');
                if (oldExecuteBtn) {
                    const newExecuteBtn = document.createElement('button');
                    newExecuteBtn.className = 'code-action-btn execute';
                    newExecuteBtn.innerHTML = '<i class="fas fa-play"></i> Execute';
                    newExecuteBtn.addEventListener('click', function() {
                        executeCode(getSubstitutedCode(newCodeElement));
                    });
                    
                    // Replace the old button
                    oldExecuteBtn.parentNode.replaceChild(newExecuteBtn, oldExecuteBtn);
                }
            }
        }
        
        // Set up events for saving
        textarea.addEventListener('blur', saveEdit);
        textarea.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            }
        });
        
        // Focus the textarea
        textarea.focus();
    }

    /**
     * Load and display tutorial playbooks
     */
    function loadTutorials() {
        fetch('/api/playbooks/tutorials/00_Tutorial_Index.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load tutorial index');
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to load tutorial index');
                }
                
                // Parse and display the tutorial index
                const tutorialPlaybook = {
                    filename: 'Tutorial Index',
                    content: data.content,
                    blocks: window.parseMarkdown(data.content)
                };
                
                // Store in active terminal's playbooks if not already there
                if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
                    window.state.terminals[window.state.activeTerminal].playbooks['tutorial_index'] = tutorialPlaybook;
                }
                
                window.displayPlaybook(tutorialPlaybook);
                
                // Enhance tutorial links to load tutorial content when clicked
                setTimeout(() => {
                    document.querySelectorAll('.playbook-content a').forEach(link => {
                        if (link.href.includes('.md')) {
                            link.addEventListener('click', function(e) {
                                e.preventDefault();
                                const tutorialPath = this.getAttribute('href');
                                loadTutorialContent(`/api/playbooks/tutorials/${tutorialPath}`);
                            });
                        }
                    });
                }, 200);
            })
            .catch(error => {
                console.error('Error loading tutorials:', error);
                showModal('themeModal', 'Unable to load tutorials. Please check if tutorial files exist in the playbooks/tutorials directory.');
            });
    }

    /**
     * Load specific tutorial content
     */
    function loadTutorialContent(tutorialPath) {
        fetch(tutorialPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load tutorial from ${tutorialPath}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to load tutorial content');
                }
                
                // Extract filename from path
                const filename = tutorialPath.split('/').pop();
                
                // Parse and display the tutorial
                const tutorialPlaybook = {
                    filename: filename,
                    content: data.content,
                    blocks: parseMarkdown(data.content)
                };
                
                // Store in active terminal's playbooks
                if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
                    window.state.terminals[window.state.activeTerminal].playbooks[filename] = tutorialPlaybook;
                }
                
                window.displayPlaybook(tutorialPlaybook);
            })
            .catch(error => {
                console.error('Error loading tutorial content:', error);
                showModal('themeModal', `Unable to load tutorial: ${error.message}`);
            });
    }

    function handlePlaybookSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const resultsContainer = document.getElementById('searchResults');
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Show a loading indicator
        resultsContainer.innerHTML = '<div class="search-result-item">Searching...</div>';
        resultsContainer.style.display = 'block';
        
        fetch(`/api/playbooks/search?query=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Search request failed with status ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                resultsContainer.innerHTML = '';
                
                if (data.results && data.results.length > 0) {
                    data.results.forEach(result => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        
                        // Highlight the matched text
                        let highlightedContent = result.line;
                        const queryRegex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
                        highlightedContent = highlightedContent.replace(queryRegex, '<span class="highlight">$1</span>');
                        
                        // Check if the line starts with ### to add special class for headings
                        let contentClass = 'content';
                        if (result.line.trim().startsWith('###')) {
                            contentClass += ' content-heading';
                            // Process the heading to wrap it in a span for better styling
                            highlightedContent = `<span class="heading-text">${highlightedContent}</span>`;
                        }
                        
                        resultItem.innerHTML = `
                            <div class="result-header">
                                <span class="filename">${result.filename}</span>
                                <span class="line-number">Line ${result.line_number}</span>
                                <div class="result-actions">
                                    <button class="result-action-btn copy" title="Copy to clipboard"><i class="fas fa-copy"></i> Copy</button>
                                    <button class="result-action-btn execute" title="Execute in current terminal"><i class="fas fa-play"></i> Execute</button>
                                    <button class="result-action-btn import" title="Import playbook"><i class="fas fa-file-import"></i> Import</button>
                                </div>
                            </div>
                            <div class="${contentClass}">${highlightedContent}</div>
                        `;
                        
                        // Add event listeners for the buttons
                        resultItem.querySelector('.import').addEventListener('click', function() {
                            importPlaybook(result.filename);
                        });
                        
                        resultItem.querySelector('.copy').addEventListener('click', function() {
                            copyToClipboard(result.line);
                            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            setTimeout(() => {
                                this.innerHTML = '<i class="fas fa-copy"></i> Copy';
                            }, 2000);
                        });
                        
                        resultItem.querySelector('.execute').addEventListener('click', function() {
                            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
                            
                            // Get the command with variable substitution
                            let commandToExecute = result.line;
                            
                            // Apply variable substitution if we have an active terminal
                            if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
                                const variables = window.state.terminals[window.state.activeTerminal].variables;
                                
                                // Perform variable substitution
                                for (const [key, value] of Object.entries(variables)) {
                                    if (value.value) {
                                        // Convert variable name to match the format in the playbooks
                                        // For example, 'targetIP' becomes '$TargetIP'
                                        const placeholder = '$' + key.charAt(0).toUpperCase() + key.slice(1);
                                        const regex = new RegExp(escapeRegExp(placeholder), 'g');
                                        commandToExecute = commandToExecute.replace(regex, `<span class="substituted">${value.value}</span>`);
                                    }
                                }
                            }
                            
                            executeInTerminal(commandToExecute)
                                .then(() => {
                                    this.innerHTML = '<i class="fas fa-check"></i> Done!';
                                    setTimeout(() => {
                                        this.innerHTML = '<i class="fas fa-play"></i> Execute';
                                    }, 2000);
                                })
                                .catch(() => {
                                    this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                                    setTimeout(() => {
                                        this.innerHTML = '<i class="fas fa-play"></i> Execute';
                                    }, 2000);
                                });
                        });
                        
                        resultsContainer.appendChild(resultItem);
                    });
                    
                    resultsContainer.style.display = 'block';
                } else {
                    resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
                    resultsContainer.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error searching playbooks:', error);
                resultsContainer.innerHTML = `<div class="search-result-item">Error searching playbooks: ${error.message}</div>`;
                resultsContainer.style.display = 'block';
            });
    }

    // Helper function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Find the button that triggered the copy and show visual feedback
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    const originalText = activeButton.textContent;
                    const originalClass = activeButton.className;
                    
                    // Change button text and add success class
                    activeButton.textContent = 'Copied!';
                    activeButton.className = 'code-action-btn copy-success';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = originalText;
                        activeButton.className = originalClass;
                    }, 1500);
                }
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                
                // Visual indication of failure
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    const originalText = activeButton.textContent;
                    const originalClass = activeButton.className;
                    
                    // Change button text and add failure class
                    activeButton.textContent = 'Failed!';
                    activeButton.className = 'code-action-btn copy-fail';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = originalText;
                        activeButton.className = originalClass;
                    }, 1500);
                }
            });
    }

    function executeInTerminal(command) {
        if (!window.state.activeTerminal) {
            showModal('themeModal', 'No active terminal found');
            return Promise.reject(new Error('No active terminal'));
        }
        
        const terminalPort = window.state.terminals[window.state.activeTerminal].port;
        
        // Find the button that triggered the execution and show visual feedback
        const activeButton = document.activeElement;
        if (activeButton && activeButton.classList.contains('code-action-btn')) {
            const originalText = activeButton.textContent;
            const originalClass = activeButton.className;
            
            // Change button text and add progress class
            activeButton.textContent = 'Executing...';
            activeButton.className = 'code-action-btn execute-progress';
        }
        
        fetch('/api/terminals/sendkeys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                port: terminalPort,
                keys: command
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to execute command:', data.error);
                
                // Show failure feedback if we have the active button
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    activeButton.textContent = 'Failed!';
                    activeButton.className = 'code-action-btn execute-fail';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = 'Execute';
                        activeButton.className = 'code-action-btn execute';
                    }, 1500);
                }
            } else {
                // Show success feedback if we have the active button
                const activeButton = document.activeElement;
                if (activeButton && activeButton.classList.contains('code-action-btn')) {
                    activeButton.textContent = 'Executed!';
                    activeButton.className = 'code-action-btn execute-success';
                    
                    // Reset button after 1.5 seconds
                    setTimeout(() => {
                        activeButton.textContent = 'Execute';
                        activeButton.className = 'code-action-btn execute';
                    }, 1500);
                }
            }
        })
        .catch(error => {
            console.error('Error executing command:', error);
            
            // Show failure feedback if we have the active button
            const activeButton = document.activeElement;
            if (activeButton && activeButton.classList.contains('code-action-btn')) {
                activeButton.textContent = 'Failed!';
                activeButton.className = 'code-action-btn execute-fail';
                
                // Reset button after 1.5 seconds
                setTimeout(() => {
                    activeButton.textContent = 'Execute';
                    activeButton.className = 'code-action-btn execute';
                }, 1500);
            }
        });
    }

    function importPlaybook(filename) {
        // Ensure we have an active terminal
        if (!window.state.activeTerminal || !window.state.terminals[window.state.activeTerminal]) {
            console.error('No active terminal for playbook import');
            return;
        }
        
        // Encode the filename to handle spaces and special characters
        const encodedFilename = encodeURIComponent(filename);
        
        fetch(`/api/playbooks/load/${encodedFilename}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Create the playbook object
                    const playbook = {
                        filename: data.filename,
                        content: data.content,
                        blocks: parseMarkdown(data.content),
                        last_modified: Date.now() / 1000, // Add timestamp for synchronization
                        editor: 'client',  // Add editor information
                        terminal_id: `term-${window.state.terminals[window.state.activeTerminal].port}` // Associate with current terminal
                    };
                    
                    // Store in active terminal's playbooks
                    window.state.terminals[window.state.activeTerminal].playbooks[data.filename] = playbook;
                    
                    // Display the playbook
                    displayPlaybook(playbook);
                    
                    // Sync to server for other clients
                    fetch(`/api/playbooks/sync/${encodedFilename}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            content: data.content,
                            editor: 'client',
                            terminal_id: `term-${window.state.terminals[window.state.activeTerminal].port}` // Include terminal ID
                        })
                    }).catch(error => {
                        console.error('Error syncing imported playbook:', error);
                    });
                    
                    // Clear search if this was called from search results
                    const searchInput = document.getElementById('searchInput');
                    const resultsContainer = document.getElementById('searchResults');
                    
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    if (resultsContainer) {
                        resultsContainer.style.display = 'none';
                    }
                } else if (!data.success) {
                    console.error('Error importing playbook:', data.error);
                    showErrorModal(`Failed to import playbook: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error importing playbook:', error);
                showErrorModal('Failed to import playbook. Check the console for details.');
            });
    }

    /**
     * Notes Management Functions
     */
    
    function setupNotesPanel() {
        // Global notes toggle
        const globalNotesBtn = document.getElementById('globalNotesBtn');
        const globalNotesPanel = document.getElementById('globalNotesPanel');
        const tabNotesBtn = document.getElementById('tabNotesBtn');
        const tabNotesPanel = document.getElementById('tabNotesPanel');
        
        if (globalNotesBtn && globalNotesPanel) {
            globalNotesBtn.addEventListener('click', function() {
                // If tab notes is visible, hide it when showing global notes
                if (tabNotesPanel && tabNotesPanel.classList.contains('visible')) {
                    tabNotesPanel.classList.remove('visible');
                }
                
                globalNotesPanel.classList.toggle('visible');
            });
            
            globalNotesPanel.querySelector('.close-notes-btn').addEventListener('click', function() {
                globalNotesPanel.classList.remove('visible');
            });
        }
        
        // Tab notes toggle
        if (tabNotesBtn && tabNotesPanel) {
            tabNotesBtn.addEventListener('click', function() {
                // If global notes is visible, hide it when showing tab notes
                if (globalNotesPanel && globalNotesPanel.classList.contains('visible')) {
                    globalNotesPanel.classList.remove('visible');
                }
                
                tabNotesPanel.classList.toggle('visible');
            });
            
            tabNotesPanel.querySelector('.close-notes-btn').addEventListener('click', function() {
                tabNotesPanel.classList.remove('visible');
            });
        }
        
        // Setup notes saving
        const globalNotesText = document.getElementById('globalNotesText');
        if (globalNotesText) {
            globalNotesText.addEventListener('input', debounce(saveGlobalNotes, 500));
        }
        
        const tabNotesText = document.getElementById('tabNotesText');
        if (tabNotesText) {
            tabNotesText.addEventListener('input', debounce(saveTabNotes, 500));
        }
    }

    function loadGlobalNotes() {
        fetch('/api/notes/global')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('globalNotesText').value = data.content;
                }
            })
            .catch(error => {
                console.error('Error loading global notes:', error);
            });
    }

    function loadTabNotes(terminalId) {
        if (!terminalId) return;
        
        const port = window.state.terminals[terminalId].port;
        fetch(`/api/notes/tab/term-${port}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('tabNotesText').value = data.content;
                }
            })
            .catch(error => {
                console.error('Error loading tab notes:', error);
            });
    }

    function saveGlobalNotes() {
        const content = document.getElementById('globalNotesText').value;
        
        fetch('/api/notes/global', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        })
        .catch(error => {
            console.error('Error saving global notes:', error);
        });
    }

    function saveTabNotes() {
        if (!window.state.activeTerminal) return;
        
        const content = document.getElementById('tabNotesText').value;
        const port = window.state.terminals[window.state.activeTerminal].port;
        
        fetch(`/api/notes/tab/term-${port}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        })
        .catch(error => {
            console.error('Error saving tab notes:', error);
        });
    }

    /**
     * Utility Functions
     */
    
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    function sanitizeForCssClass(filename) {
        if (!filename) return '';
        // Replace spaces, periods, parentheses and other invalid CSS characters with hyphens
        return filename.replace(/[ .()[\]{}:;,#&]/g, '-');
    }

    // Setup custom variable management
    function setupCustomVariables() {
        const addVariableBtn = document.getElementById('addVariableBtn');
        if (addVariableBtn) {
            addVariableBtn.addEventListener('click', function() {
                // Prompt for variable name
                const variableName = prompt('Enter variable name (camelCase recommended):');
                if (!variableName) return;
                
                // Validate variable name
                if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variableName)) {
                    showModal('themeModal', 'Variable name must start with a letter and contain only letters and numbers');
                    return;
                }
                
                // Check if variable already exists
                if (document.getElementById(variableName)) {
                    showModal('themeModal', 'A variable with this name already exists');
                    return;
                }
                
                // Create variable input
                const variableInput = document.createElement('div');
                variableInput.className = 'variable-input custom-variable';
                
                // First letter uppercase for display, camelCase for ID
                const displayName = variableName.charAt(0).toUpperCase() + variableName.slice(1);
                const placeholderName = '$' + displayName;
                
                // Create the HTML structure
                variableInput.innerHTML = `
                    <label for="${variableName}">${displayName}:</label>
                    <input type="text" id="${variableName}" name="${variableName}" placeholder="${placeholderName}">
                    <button class="remove-variable-btn" title="Remove Variable">&times;</button>
                `;
                
                // Add to DOM
                const container = document.getElementById('variableInputsContainer');
                if (container) {
                    container.appendChild(variableInput);
                }
                
                // Add event listener to remove button
                variableInput.querySelector('.remove-variable-btn').addEventListener('click', function() {
                    const varName = variableInput.querySelector('input').name;
                    const displayName = variableInput.querySelector('label').textContent;
                    if (confirm(`Remove ${displayName} variable?`)) {
                        variableInput.remove();
                        delete window.state.terminals[window.state.activeTerminal].variables[varName];
                        updateVariableSubstitutions();
                    }
                });
                
                // Add event listener to input
                variableInput.querySelector('input').addEventListener('input', function() {
                    window.state.terminals[window.state.activeTerminal].variables[this.id].value = this.value;
                    updateVariableSubstitutions();
                });
                
                // Initialize this variable in all terminals
                Object.keys(window.state.terminals).forEach(terminalId => {
                    if (!window.state.terminals[terminalId].variables) {
                        window.state.terminals[terminalId].variables = {};
                    }
                    window.state.terminals[terminalId].variables[variableName] = {
                        title: displayName,
                        name: placeholderName,
                        value: ''
                    };
                });
            });
        }
    }

    function migrateGlobalPlaybooks() {
        // Check if there are any global playbooks
        if (Object.keys(window.state.globalPlaybooks).length > 0) {
            // Get the active terminal
            const activeTerminal = window.state.activeTerminal;
            
            // Migrate each global playbook to the active terminal
            Object.keys(window.state.globalPlaybooks).forEach(playbookName => {
                const playbook = window.state.globalPlaybooks[playbookName];
                
                // Store in active terminal's playbooks
                window.state.terminals[activeTerminal].playbooks[playbookName] = playbook;
                
                // Remove from global playbooks
                delete window.state.globalPlaybooks[playbookName];
            });
        }
    }

    function displayTerminalPlaybooks(terminalId) {
        const playbooksContainer = document.getElementById('playbooks');
        if (!playbooksContainer) return;
        
        // Clear the playbooks container
        playbooksContainer.innerHTML = '';
        
        // Display playbooks for the active terminal
        Object.keys(window.state.terminals[terminalId].playbooks).forEach(playbookName => {
            const playbook = window.state.terminals[terminalId].playbooks[playbookName];
            window.displayPlaybook(playbook, terminalId);
        });
    }

    /**
     * Playbook Creation Functions
     */
    
    function setupCreatePlaybook() {
        // Get modal elements
        const modal = document.getElementById('createPlaybookModal');
        const createBtn = document.getElementById('createPlaybookBtn');
        const closeBtn = modal.querySelector('.close-modal-btn');
        const cancelBtn = document.getElementById('cancelPlaybookBtn');
        const submitBtn = document.getElementById('createPlaybookSubmitBtn');
        const nameInput = document.getElementById('newPlaybookName');
        const contentInput = document.getElementById('newPlaybookContent');
        
        // Open modal when create button is clicked
        createBtn.addEventListener('click', function() {
            modal.style.display = 'block';
            nameInput.focus();
        });
        
        // Close modal when close button is clicked
        closeBtn.addEventListener('click', closeModal);
        
        // Close modal when cancel button is clicked
        cancelBtn.addEventListener('click', closeModal);
        
        // Close modal when escape key is pressed
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeModal();
            }
        });
        
        // Close when clicking elsewhere
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
        
        // Close modal function
        function closeModal() {
            modal.style.display = 'none';
        }
        
        // Submit button handler
        submitBtn.addEventListener('click', function() {
            try {
                const name = nameInput.value.trim();
                if (!name) {
                    showErrorModal('Please enter a playbook name');
                    return;
                }
                
                const content = contentInput.value.trim();
                if (!content) {
                    showErrorModal('Please enter playbook content');
                    return;
                }
                
                // Ensure filename has .md extension
                let filename = name;
                if (!filename.endsWith('.md')) {
                    filename += '.md';
                }
                
                // Create timestamp for synchronization
                const timestamp = Date.now() / 1000;
                
                // Create playbook object
                const playbook = {
                    filename: filename,
                    content: content,
                    blocks: parseMarkdown(content),
                    last_modified: timestamp,
                    editor: 'client'
                };
                
                // Store playbook in active terminal state
                if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
                    window.state.terminals[window.state.activeTerminal].playbooks[filename] = playbook;
                    
                    // Display the playbook
                    displayPlaybook(playbook);
                }
                
                // Save to server
                fetch('/api/playbooks/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filename: filename,
                        content: content,
                        editor: 'client',
                        timestamp: timestamp
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        console.error('Error saving playbook:', data.error);
                        showErrorModal(`Failed to save playbook: ${data.error}`);
                    }
                })
                .catch(error => {
                    console.error('Error saving playbook:', error);
                    showErrorModal(`Failed to save playbook: ${error.message}`);
                });
                
                // Close the modal
                closeModal();
            } catch (error) {
                console.error('Error creating playbook:', error);
                showErrorModal(`Failed to create playbook: ${error.message}`);
            }
        });
    }
    
    /**
     * Setup collapsible sections
     */
    function setupCollapsibleSections() {
        document.querySelectorAll('.playbook-header').forEach(header => {
            if (!header.hasAttribute('listener-added')) {
                header.setAttribute('listener-added', 'true');
                header.addEventListener('click', function() {
                    const content = this.nextElementSibling;
                    const indicator = this.querySelector('.dropdown-indicator');
                    
                    if (content && content.classList.contains('playbook-content')) {
                        content.classList.toggle('collapsed');
                        
                        if (indicator) {
                            indicator.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
                        }
                    }
                });
            }
        });
    }

    /**
     * Setup modal functionality
     */
    function setupModals() {
        // Get all modal elements
        const modals = document.querySelectorAll('.modal-container');
        
        // Setup close functionality for each modal
        modals.forEach(modal => {
            // Close button in header
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    modal.style.display = 'none';
                });
            }
            
            // Close button in footer
            const footerBtn = modal.querySelector('.modal-footer .modal-btn');
            if (footerBtn) {
                footerBtn.addEventListener('click', function() {
                    modal.style.display = 'none';
                });
            }
            
            // Close when clicking outside the modal
            window.addEventListener('click', function(event) {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    /**
     * Show a modal dialog
     * @param {string} modalId - ID of the modal to show
     * @param {string} customMessage - Optional custom message to display in the modal body
     */
    function showModal(modalId, customMessage = null) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Set custom message if provided
        if (customMessage) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                // Save original content if not already saved
                if (!modalBody.dataset.originalContent) {
                    modalBody.dataset.originalContent = modalBody.innerHTML;
                }
                modalBody.innerHTML = `<p>${customMessage}</p>`;
            }
        } else {
            // Restore original content if it exists
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody && modalBody.dataset.originalContent) {
                modalBody.innerHTML = modalBody.dataset.originalContent;
            }
        }
        
        // Display the modal
        modal.style.display = 'block';
        
        // Add ESC key to close modal
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Show an error modal with proper styling and title
     * @param {string} message - The error message to display
     */
    function showErrorModal(message) {
        const modal = document.getElementById('errorModal');
        if (!modal) return;
        
        // Set the error message
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        // Display the modal
        modal.style.display = 'block';
        
        // Add ESC key to close modal
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                window.removeEventListener('keydown', escHandler);
            }
        };
        
        window.addEventListener('keydown', escHandler);
    }

    /**
     * Setup settings dropdown functionality
     */
    function setupSettingsDropdown() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsDropdown = document.getElementById('settingsDropdown');
        
        // Toggle dropdown when settings button is clicked
        if (settingsBtn && settingsDropdown) {
            settingsBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                settingsDropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking elsewhere
            window.addEventListener('click', function(event) {
                if (settingsDropdown.classList.contains('show') && !event.target.matches('#settingsBtn')) {
                    settingsDropdown.classList.remove('show');
                }
            });
            
            // Setup dropdown menu items
            const tutorialsMenuItem = document.getElementById('tutorialsMenuItem');
            if (tutorialsMenuItem) {
                tutorialsMenuItem.addEventListener('click', function(event) {
                    event.preventDefault();
                    settingsDropdown.classList.remove('show');
                    
                    // Use the fetch approach directly instead of calling loadTutorials
                    fetch('/api/playbooks/tutorials/00_Tutorial_Index.md')
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Failed to load tutorial index');
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (!data.success) {
                                throw new Error(data.error || 'Failed to load tutorial index');
                            }
                            
                            // Get the active terminal
                            if (!window.state || !window.state.activeTerminal) {
                                showModal('themeModal', 'No active terminal found');
                                return;
                            }
                            
                            // Parse and display the tutorial index
                            const tutorialPlaybook = {
                                filename: 'Tutorial Index',
                                content: data.content,
                                blocks: window.parseMarkdown(data.content)
                            };
                            
                            // Store in active terminal's playbooks if not already there
                            if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
                                window.state.terminals[window.state.activeTerminal].playbooks['tutorial_index'] = tutorialPlaybook;
                            }
                            
                            // Display the playbook
                            window.displayPlaybook(tutorialPlaybook);
                            
                            // Enhance tutorial links to load tutorial content when clicked
                            setTimeout(() => {
                                document.querySelectorAll('.playbook-content a').forEach(link => {
                                    if (link.href.includes('.md')) {
                                        link.addEventListener('click', function(e) {
                                            e.preventDefault();
                                            const tutorialPath = this.getAttribute('href');
                                            
                                            // Use the fetch approach directly for loading tutorial content
                                            fetch(`/api/playbooks/tutorials/${tutorialPath}`)
                                                .then(response => {
                                                    if (!response.ok) {
                                                        throw new Error(`Failed to load tutorial from ${tutorialPath}`);
                                                    }
                                                    return response.json();
                                                })
                                                .then(data => {
                                                    if (!data.success) {
                                                        throw new Error(data.error || 'Failed to load tutorial content');
                                                    }
                                                    
                                                    // Extract filename from path
                                                    const filename = tutorialPath.split('/').pop();
                                                    
                                                    // Parse and display the tutorial
                                                    const tutorialPlaybook = {
                                                        filename: filename,
                                                        content: data.content,
                                                        blocks: parseMarkdown(data.content)
                                                    };
                                                    
                                                    // Store in active terminal's playbooks
                                                    if (window.state.activeTerminal && window.state.terminals[window.state.activeTerminal]) {
                                                        window.state.terminals[window.state.activeTerminal].playbooks[filename] = tutorialPlaybook;
                                                    }
                                                    
                                                    // Display the playbook
                                                    window.displayPlaybook(tutorialPlaybook);
                                                })
                                                .catch(error => {
                                                    console.error('Error loading tutorial content:', error);
                                                    showModal('themeModal', `Unable to load tutorial: ${error.message}`);
                                                });
                                        });
                                    }
                                });
                            }, 200);
                        })
                        .catch(error => {
                            console.error('Error loading tutorials:', error);
                            showModal('themeModal', 'Unable to load tutorials. Please check if tutorial files exist in the playbooks/tutorials directory.');
                        });
                });
            }
            
            const themeMenuItem = document.getElementById('themeMenuItem');
            if (themeMenuItem) {
                themeMenuItem.addEventListener('click', function(event) {
                    event.preventDefault();
                    settingsDropdown.classList.remove('show');
                    showModal('themeModal');
                });
            }
            
            const aboutMenuItem = document.getElementById('aboutMenuItem');
            if (aboutMenuItem) {
                aboutMenuItem.addEventListener('click', function(event) {
                    event.preventDefault();
                    settingsDropdown.classList.remove('show');
                    showModal('aboutModal');
                });
            }
        }
        
        // Setup theme toggling
        setupThemeToggle();
    }
    
    // Setup theme toggling
    function setupThemeToggle() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', function() {
                const theme = this.dataset.theme;
                applyTheme(theme);
                
                // Update active state visually
                themeOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Initialize theme on page load
        initializeTheme();
    }

    /**
     * Initialize theme based on saved preference or system preference
     */
    function initializeTheme() {
        const savedTheme = localStorage.getItem('commandwave-theme');
        
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            applyTheme('dark'); // Always default to dark theme
        }
    }

    /**
     * Apply the specified theme to the application
     * @param {string} theme - The theme to apply ('dark', 'light', or 'witchhazel')
     */
    function applyTheme(theme) {
        // Remove any existing theme attributes first
        document.documentElement.removeAttribute('data-theme');
        
        // Apply the selected theme if not dark (dark is default)
        if (theme === 'light' || theme === 'witchhazel') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // Save preference to localStorage
        localStorage.setItem('commandwave-theme', theme);
        
        // Update active state in theme modal if it's open
        updateThemeModalActiveState(theme);
    }

    /**
     * Update the active state in the theme modal
     * @param {string} activeTheme - The currently active theme
     */
    function updateThemeModalActiveState(activeTheme) {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            if (option.dataset.theme === activeTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    /**
     * Setup toggle functionality for the variables section
     */
    function setupVariablesToggle() {
        const toggleBtn = document.getElementById('toggleVariablesBtn');
        const variableContent = document.getElementById('variableContent');
        const collapseIcon = document.getElementById('variablesCollapseIcon');
        
        if (toggleBtn && variableContent) {
            // Check if we have a saved state
            const isCollapsed = localStorage.getItem('commandwave-variables-collapsed') === 'true';
            
            // Set initial state
            if (isCollapsed) {
                variableContent.classList.add('collapsed');
                collapseIcon.classList.remove('fa-angle-down');
                collapseIcon.classList.add('fa-angle-up');
            }
            
            // Add click handler for toggle button
            toggleBtn.addEventListener('click', function() {
                const isCurrentlyCollapsed = variableContent.classList.contains('collapsed');
                
                // Toggle collapsed state
                if (isCurrentlyCollapsed) {
                    variableContent.classList.remove('collapsed');
                    collapseIcon.classList.remove('fa-angle-up');
                    collapseIcon.classList.add('fa-angle-down');
                    localStorage.setItem('commandwave-variables-collapsed', 'false');
                } else {
                    variableContent.classList.add('collapsed');
                    collapseIcon.classList.remove('fa-angle-down');
                    collapseIcon.classList.add('fa-angle-up');
                    localStorage.setItem('commandwave-variables-collapsed', 'true');
                }
            });
        }
    }

    /**
     * Terminal Resize Handler
     * Ensures terminal fills available space and handles window resize events
     */
    function setupTerminalResize() {
        const terminalContainer = document.querySelector('.terminal-container');
        const terminalIframes = document.querySelectorAll('.terminal-iframe');
        
        // Function to set proper iframe dimensions
        function resizeTerminals() {
            terminalIframes.forEach(iframe => {
                // Force a resize by sending a command to ttyd
                try {
                    if (iframe.contentWindow && iframe.contentWindow.document) {
                        const resizeEvent = new Event('resize');
                        iframe.contentWindow.dispatchEvent(resizeEvent);
                    }
                } catch (e) {
                    // Cross-origin frame access might be restricted
                    // This is expected and can be ignored
                }
            });
        }
        
        // Resize on window resize
        window.addEventListener('resize', resizeTerminals);
        
        // Initial resize
        resizeTerminals();
        
        // Additional resize attempts after iframe content might have loaded
        setTimeout(resizeTerminals, 1000);  // 1 second
        setTimeout(resizeTerminals, 3000);  // 3 seconds
    }
});

/**
 * Import a playbook from the server
 * @param {string} filename - Name of the playbook file to import
 */
window.importPlaybook = function(filename) {
    // Ensure we have an active terminal
    if (!window.state.activeTerminal || !window.state.terminals[window.state.activeTerminal]) {
        console.error('No active terminal for playbook import');
        return;
    }
    
    // Encode the filename to handle spaces and special characters
    const encodedFilename = encodeURIComponent(filename);
    
    fetch(`/api/playbooks/load/${encodedFilename}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Create the playbook object
                const playbook = {
                    filename: data.filename,
                    content: data.content,
                    blocks: parseMarkdown(data.content),
                    last_modified: Date.now() / 1000, // Add timestamp for synchronization
                    editor: 'client',  // Add editor information
                    terminal_id: `term-${window.state.terminals[window.state.activeTerminal].port}` // Associate with current terminal
                };
                
                // Store in active terminal's playbooks
                window.state.terminals[window.state.activeTerminal].playbooks[data.filename] = playbook;
                
                // Display the playbook
                displayPlaybook(playbook);
                
                // Sync to server for other clients
                fetch(`/api/playbooks/sync/${encodedFilename}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: data.content,
                        editor: 'client',
                        terminal_id: `term-${window.state.terminals[window.state.activeTerminal].port}` // Include terminal ID
                    })
                }).catch(error => {
                    console.error('Error syncing imported playbook:', error);
                });
                
                // Clear search if this was called from search results
                const searchInput = document.getElementById('searchInput');
                const resultsContainer = document.getElementById('searchResults');
                
                if (searchInput) {
                    searchInput.value = '';
                }
                if (resultsContainer) {
                    resultsContainer.style.display = 'none';
                }
            } else if (!data.success) {
                console.error('Error importing playbook:', data.error);
                showErrorModal(`Failed to import playbook: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error importing playbook:', error);
            showErrorModal('Failed to import playbook. Check the console for details.');
        });
    }
