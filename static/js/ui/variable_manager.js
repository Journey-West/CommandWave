/**
 * variable_manager.js - Modular variable management for CommandWave
 * Handles variable operations, UI interactions, and state management
 */

class VariableManager {
    constructor() {
        this.variables = {};
        this.sectionCollapsed = false;
        this.variableSectionElement = document.getElementById('variableContent');
        this.variableInputsContainer = document.getElementById('variableInputsContainer');
        
        // Get the API base URL from the hidden element or fallback to window.location
        const apiBaseUrlElem = document.getElementById('api-base-url');
        this.apiBaseUrl = apiBaseUrlElem && apiBaseUrlElem.dataset.url 
            ? apiBaseUrlElem.dataset.url 
            : window.location.origin + '/';
        
        // Ensure API base URL ends with a slash
        if (!this.apiBaseUrl.endsWith('/')) {
            this.apiBaseUrl += '/';
        }
        
        // Default variables that should not be deleted (with all possible case variations)
        this.defaultVariableNames = [
            'Port', 'port', 'PORT',
            'Host', 'host', 'HOST',
            'Username', 'username', 'USERNAME',
            'Password', 'password', 'PASSWORD',
            'Domain', 'domain', 'DOMAIN',
            'Protocol', 'protocol', 'PROTOCOL',
            'Wordlist', 'wordlist', 'WORDLIST',
            'TargetIP', 'targetIP', 'TARGETIP',
            'DCIP', 'dcIP', 'DCIP',
            'UserFile', 'userFile', 'USERFILE',
            'PassFile', 'passFile', 'PASSFILE',
            'ControlSocket', 'controlSocket', 'CONTROLSOCKET'
        ];
        
        console.log('Variable manager initialized with API base URL:', this.apiBaseUrl);
        
        // Initialize manager
        this.init();
    }
    
    /**
     * Check if a variable is a default/system variable
     * @param {string} name - Variable name to check
     * @returns {boolean} - True if it's a default variable
     */
    isDefaultVariable(name) {
        if (!name) return false;
        
        // Convert to lowercase for case-insensitive comparison
        const nameLower = name.toLowerCase();
        
        // Check against lowercase versions of default names
        return this.defaultVariableNames.some(defaultName => 
            defaultName.toLowerCase() === nameLower
        );
    }
    
    /**
     * Initialize variable system
     */
    init() {
        // Load variables from DOM
        this.loadVariables();
        
        // Set up section toggle
        this.setupSectionToggle();
        
        // Set up variable forms
        this.setupVariableForms();
        
        // Set up variable actions (none needed currently)
        this.setupVariableActions();
        
        // Set up add variable button
        this.setupAddVariableButton();
        
        // Initialize event handlers
        this.initEventHandlers();
        
        console.log(`Variable manager initialized with ${Object.keys(this.variables).length} variables`);
    }
    
    /**
     * Initialize the event handlers for variable-related actions
     */
    initEventHandlers() {
        // Setup for add variable button
        const addVariableBtn = document.getElementById('addVariableBtn');
        if (addVariableBtn) {
            addVariableBtn.addEventListener('click', () => {
                this.openAddVariableModal();
            });
        }
        
        // Initialize modal listeners
        this.initEditModalListeners();
        this.initAddModalListeners();
        
        // Setup variable search
        this.setupVariableSearch();
    }
    
    /**
     * Open the add variable modal
     */
    openAddVariableModal() {
        const modal = document.getElementById('addVariableModal');
        const nameInput = document.getElementById('newVariableName');
        const refInput = document.getElementById('newVariableReference');
        const valueInput = document.getElementById('newVariableValue');
        
        if (modal && nameInput && valueInput && refInput) {
            // Reset form
            nameInput.value = '';
            refInput.value = '$';
            valueInput.value = '';
            
            // Show the modal
            if (window.modalController) {
                window.modalController.openModal('addVariableModal');
            } else {
                modal.classList.add('active');
            }
            
            // Focus the name input
            nameInput.focus();
        }
    }
    
    /**
     * Load variables from DOM
     */
    loadVariables() {
        // Load custom variables from the variable-input elements with custom-variable class
        const customVariableInputs = document.querySelectorAll('.variable-input.custom-variable');
        
        customVariableInputs.forEach(item => {
            const input = item.querySelector('.custom-variable-input');
            const name = input.dataset.variableName;
            const value = input.value.trim();
            
            if (name) {
                this.variables[name] = {
                    value: value,
                    element: input
                };
                
                // Keep variable map updated on input change
                input.addEventListener('input', (e) => {
                    this.variables[name].value = e.target.value.trim();
                    // Dispatch event so playbook content can re-render
                    document.dispatchEvent(new CustomEvent('variableValueChanged'));
                });
                
                // Add double-click handler for editing
                input.addEventListener('dblclick', (e) => {
                    this.openEditVariableModal(name, value);
                });
            }
        });
        
        // --- Add default variable inputs ---
        const defaultVars = [
            { id: 'targetIP', name: 'TargetIP' },
            { id: 'port', name: 'Port' },
            { id: 'dcIP', name: 'DCIP' },
            { id: 'userFile', name: 'UserFile' },
            { id: 'passFile', name: 'PassFile' },
            { id: 'wordlist', name: 'Wordlist' },
            { id: 'controlSocket', name: 'ControlSocket' }
        ];
        defaultVars.forEach(({ id, name }) => {
            const input = document.getElementById(id);
            if (input) {
                this.variables[name] = { value: input.value.trim(), element: input };
                // Keep variable map updated on input change
                input.addEventListener('input', (e) => {
                    this.variables[name].value = e.target.value.trim();
                    // Dispatch event so playbook content can re-render
                    document.dispatchEvent(new CustomEvent('variableValueChanged'));
                });
                
                // Add double-click handler for editing default variables too
                input.addEventListener('dblclick', (e) => {
                    this.openEditVariableModal(name, input.value.trim());
                });
            }
        });
        
        // Check if section is collapsed
        if (this.variableSectionElement && this.variableSectionElement.classList.contains('collapsed')) {
            this.sectionCollapsed = true;
        }
    }
    
    /**
     * Set up variable section toggle
     */
    setupSectionToggle() {
        const toggleButton = document.getElementById('toggleVariablesBtn');
        const collapseIcon = document.getElementById('variablesCollapseIcon');
        
        if (toggleButton && this.variableSectionElement && collapseIcon) {
            toggleButton.addEventListener('click', () => {
                this.toggleVariableSection();
            });
        }
    }
    
    /**
     * Toggle the variable section visibility
     */
    toggleVariableSection() {
        if (!this.variableSectionElement) return;
        
        this.sectionCollapsed = !this.sectionCollapsed;
        this.variableSectionElement.classList.toggle('collapsed', this.sectionCollapsed);
        
        const collapseIcon = document.getElementById('variablesCollapseIcon');
        if (collapseIcon) {
            if (this.sectionCollapsed) {
                collapseIcon.classList.remove('fa-angle-down');
                collapseIcon.classList.add('fa-angle-right');
            } else {
                collapseIcon.classList.remove('fa-angle-right');
                collapseIcon.classList.add('fa-angle-down');
            }
        }
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('variableSectionToggled', {
            detail: { collapsed: this.sectionCollapsed }
        }));
    }
    
    /**
     * Set up variable form submissions
     */
    setupVariableForms() {
        // Create new variable form
        const createForm = document.getElementById('createVariableForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateVariable(createForm);
            });
        }
        
        // Edit variable form
        const editForm = document.getElementById('editVariableForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditVariableSubmit();
            });
        }
    }
    
    /**
     * Set up variable actions
     */
    setupVariableActions() {
        // No variable actions are needed now that edit/delete buttons are removed
        // This function is kept as a placeholder for future enhancements
        console.log("Variable actions setup - custom variables now match default ones");
    }
    
    /**
     * Set up add variable button
     */
    setupAddVariableButton() {
        // Connect the "Add Variable" button to the modal
        const addVariableBtn = document.getElementById('addVariableInput');
        if (addVariableBtn) {
            addVariableBtn.addEventListener('click', () => {
                this.openAddVariableModal();
            });
            
            // Also connect the label that's styled as a button
            const addVariableLabel = document.querySelector('.add-variable-btn');
            if (addVariableLabel) {
                addVariableLabel.addEventListener('click', () => {
                    this.openAddVariableModal();
                });
            }
        }
        
        // Set up the form submission in the modal
        const addVariableForm = document.getElementById('addVariableForm');
        const submitBtn = document.getElementById('submitAddVariable');
        const cancelBtn = document.getElementById('cancelAddVariable');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (addVariableForm) {
                    const nameInput = document.getElementById('variableName');
                    const valueInput = document.getElementById('variableValue');
                    
                    if (nameInput && valueInput) {
                        const name = nameInput.value.trim();
                        const value = valueInput.value.trim();
                        
                        if (name) {
                            this.createVariable(name, value);
                            this.closeModal('addVariableModal');
                            
                            // Reset form
                            nameInput.value = '';
                            valueInput.value = '';
                        } else {
                            this.showError('Variable name cannot be empty');
                        }
                    }
                }
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal('addVariableModal');
            });
        }
        
        // Set up modal close button
        const closeBtn = document.querySelector('#addVariableModal .modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal('addVariableModal');
            });
        }
    }
    
    /**
     * Handle creating a new variable
     * @param {HTMLFormElement} form - The form element
     */
    handleCreateVariable(form) {
        const nameInput = form.querySelector('#newVariableName');
        const valueInput = form.querySelector('#newVariableValue');
        
        if (!nameInput || !valueInput) return;
        
        let name = nameInput.value.trim();
        const value = valueInput.value.trim();
        // Strip leading $ if present
        if (name.startsWith('$')) {
            name = name.slice(1);
        }
        if (!name) {
            this.showError('Variable name cannot be empty');
            return;
        }
        
        // Create new variable via API
        this.createVariable(name, value, form);
    }
    
    /**
     * Create a new variable
     * @param {string} name - Variable name
     * @param {string} value - Variable value
     * @param {HTMLFormElement} form - The form element (for resetting)
     */
    createVariable(name, value, form) {
        // Ensure URL doesn't have double slashes
        const apiUrl = `${this.apiBaseUrl}api/variables/create`.replace(/([^:]\/)\/+/g, '$1');
        console.log('Creating variable with URL:', apiUrl);
        
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, value })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                this.closeModal('addVariableModal');
                
                // Refresh variable list with the new format
                this.refreshVariableList();
                
                // Reset form
                if (form) {
                    form.reset();
                }
            } else {
                this.showError(data.error || 'Failed to create variable');
            }
        })
        .catch(error => {
            console.error('API error:', error);
            this.showError('Error creating variable: ' + error.message);
        });
    }
    
    /**
     * Open the edit variable modal
     * @param {string} name - Variable name
     * @param {string} value - Variable value
     */
    openEditVariableModal(name, value) {
        const editModal = document.getElementById('editVariableModal');
        const nameInput = document.getElementById('editVariableName');
        const refInput = document.getElementById('editVariableReference');
        const valueInput = document.getElementById('editVariableValue');
        const oldNameInput = document.getElementById('oldVariableName');
        const deleteBtn = document.getElementById('deleteVariableBtn');
        const modalTitle = editModal && editModal.querySelector('.modal-header h3');
        
        if (editModal && nameInput && valueInput && oldNameInput && refInput) {
            // Strip $ if present in name
            if (name.startsWith('$')) {
                name = name.slice(1);
            }
            
            // Use the isDefaultVariable method for consistency
            const isDefaultVar = this.isDefaultVariable(name);
            
            console.log(`Opening edit modal for variable: ${name}, isDefault: ${isDefaultVar}`);
            
            // Update modal title based on variable type
            if (modalTitle) {
                modalTitle.textContent = isDefaultVar ? 'Edit System Variable' : 'Edit Variable';
            }
            
            nameInput.value = name;
            refInput.value = `$${name}`; // Set the reference field with $ prefix
            valueInput.value = value;
            oldNameInput.value = name;
            
            // Set up validation for no spaces in reference field
            nameInput.oninput = () => {
                // Keep spaces in name field, but generate a reference without spaces
                const nameWithoutSpaces = nameInput.value.replace(/\s+/g, '');
                
                // Update reference field if it still has the default pattern
                if (refInput.value === `$${oldNameInput.value}` || refInput.value.startsWith('$')) {
                    refInput.value = `$${nameWithoutSpaces}`;
                }
            };
            
            refInput.oninput = () => {
                // Remove spaces
                refInput.value = refInput.value.replace(/\s+/g, '');
                
                // Ensure it starts with $
                if (!refInput.value.startsWith('$') && refInput.value.length > 0) {
                    refInput.value = `$${refInput.value}`;
                }
            };
            
            // Show the modal
            if (window.modalController) {
                window.modalController.openModal('editVariableModal');
            } else {
                editModal.classList.add('active');
            }
            
            // Focus the value input
            valueInput.focus();
            
            // Handle delete button for default vs custom variables
            if (deleteBtn) {
                if (isDefaultVar) {
                    console.log(`Hiding delete button for default variable: ${name}`);
                    // Completely hide the delete button for default variables
                    deleteBtn.style.display = 'none';
                } else {
                    console.log(`Showing delete button for custom variable: ${name}`);
                    // Show delete button for custom variables and set up hold-to-delete
                    deleteBtn.style.display = 'flex';
                    this.setupHoldToDeleteButton(deleteBtn, name);
                }
            }
        }
    }
    
    /**
     * Handle the edit variable form submission
     */
    handleEditVariableSubmit() {
        const form = document.getElementById('editVariableForm');
        const nameInput = document.getElementById('editVariableName');
        const refInput = document.getElementById('editVariableReference');
        const valueInput = document.getElementById('editVariableValue');
        const oldNameInput = document.getElementById('oldVariableName');
        
        if (!form || !nameInput || !valueInput || !oldNameInput || !refInput) {
            this.showError('Edit form elements not found');
            return;
        }
        
        const name = nameInput.value.trim();
        const refValue = refInput.value.trim();
        const value = valueInput.value.trim();
        const oldName = oldNameInput.value.trim();
        
        // Basic validation
        if (!name) {
            this.showError('Variable name cannot be empty');
            return;
        }
        
        // Check for spaces in variable reference
        if (refValue.includes(' ')) {
            this.showError('Variable reference cannot contain spaces');
            return;
        }
        
        // Check reference format
        if (!refValue.startsWith('$')) {
            this.showError('Variable reference must start with $');
            return;
        }
        
        // Extract the actual name from the reference (without $)
        const refName = refValue.startsWith('$') ? refValue.slice(1) : refValue;
        
        // Use the reference name if it's different from the input name
        const finalName = refName !== name ? refName : name;
        
        // Edit variable via API or client-side
        this.editVariable(oldName, finalName, value);
    }
    
    /**
     * Initialize add modal event listeners
     */
    initAddModalListeners() {
        const addForm = document.getElementById('addVariableForm');
        const nameInput = document.getElementById('newVariableName');
        const valueInput = document.getElementById('newVariableValue');
        const refInput = document.getElementById('newVariableReference');
        const submitBtn = document.getElementById('submitAddVariable');
        const cancelBtn = document.getElementById('cancelAddVariable');
        
        // Set up validation for no spaces in reference field
        if (nameInput) {
            nameInput.oninput = () => {
                // Keep spaces in name field, but generate a reference without spaces
                const nameWithoutSpaces = nameInput.value.replace(/\s+/g, '');
                
                // Update reference field
                if (refInput) {
                    refInput.value = `$${nameWithoutSpaces}`;
                }
            };
        }
        
        if (refInput) {
            refInput.oninput = () => {
                // Remove spaces
                refInput.value = refInput.value.replace(/\s+/g, '');
                
                // Ensure it starts with $
                if (!refInput.value.startsWith('$') && refInput.value.length > 0) {
                    refInput.value = `$${refInput.value}`;
                }
            };
        }
        
        if (submitBtn) {
            submitBtn.onclick = () => {
                if (addForm && nameInput && valueInput) {
                    const name = nameInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    if (!name) {
                        this.showError('Variable name cannot be empty');
                        return;
                    }
                    
                    this.createVariable(name, value);
                }
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.closeModal('addVariableModal');
                
                if (addForm) {
                    addForm.reset();
                }
            };
        }
        
        // Set up modal close button
        const closeBtn = document.querySelector('#addVariableModal .modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal('addVariableModal');
            });
        }
    }
    
    /**
     * Initialize edit modal event listeners
     */
    initEditModalListeners() {
        const submitBtn = document.getElementById('submitEditVariable');
        const cancelBtn = document.getElementById('cancelEditVariable');
        
        if (submitBtn) {
            submitBtn.onclick = () => {
                this.handleEditVariableSubmit();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.closeModal('editVariableModal');
            };
        }
    }
    
    /**
     * Edit an existing variable
     * @param {string} oldName - Original variable name
     * @param {string} newName - New variable name
     * @param {string} value - New variable value
     */
    editVariable(oldName, newName, value) {
        console.log(`Client-side update of variable: ${oldName} -> ${newName}`);
        
        try {
            // Find the existing variable in the DOM - try various selectors to handle both default and custom variables
            let variableElement = null;
            let variableContainer = null;
            
            // First try by data-variable-name
            variableElement = document.querySelector(`.variable-input input[data-variable-name="${oldName}"]`);
            
            // If not found, try by input ID
            if (!variableElement) {
                variableElement = document.querySelector(`#var_${oldName}`);
            }
            
            // If still not found, try by input name
            if (!variableElement) {
                variableElement = document.querySelector(`input[name="var_${oldName}"]`);
            }
            
            // Try lowercased version for default variables
            if (!variableElement) {
                variableElement = document.querySelector(`.variable-input input[data-variable-name="${oldName.toLowerCase()}"]`);
            }
            
            // Last resort: try to find by label text
            if (!variableElement) {
                const labels = document.querySelectorAll('.variable-input label');
                for (const label of labels) {
                    if (label.textContent.replace(':', '').trim() === oldName) {
                        variableContainer = label.closest('.variable-input');
                        if (variableContainer) {
                            variableElement = variableContainer.querySelector('input');
                            break;
                        }
                    }
                }
            }
            
            // If we found the element but not the container, get the container
            if (variableElement && !variableContainer) {
                variableContainer = variableElement.closest('.variable-input');
            }
            
            // Log what we found for debugging
            console.log('Variable element found:', variableElement);
            console.log('Variable container found:', variableContainer);
            
            if (variableElement && variableContainer) {
                const label = variableContainer.querySelector('label');
                
                // Update the label if name changed
                if (oldName !== newName && label) {
                    // Update the display label (capitalized for consistency)
                    const displayName = newName.charAt(0).toUpperCase() + newName.slice(1);
                    label.textContent = `${displayName}:`;
                }
                
                // Update the input field
                variableElement.value = value;
                variableElement.dataset.variableName = newName;
                variableElement.id = `var_${newName}`;
                variableElement.name = `var_${newName}`;
                variableElement.placeholder = `$${newName}`;
                
                // Update our internal variables collection
                if (this.variables[oldName]) {
                    // If name changed, remove old entry and create new one
                    if (oldName !== newName) {
                        delete this.variables[oldName];
                    }
                    
                    // Add/update entry with new name
                    this.variables[newName] = {
                        value: value,
                        element: variableElement
                    };
                }
                
                // Close the modal
                this.closeModal('editVariableModal');
                
                console.log(`Successfully updated variable ${oldName} -> ${newName} (client-side only)`);
                
                // Dispatch event for other components that might be listening
                document.dispatchEvent(new CustomEvent('variablesUpdated', {
                    detail: { 
                        oldName, 
                        newName, 
                        value,
                        variables: this.variables
                    }
                }));
            } else {
                // Before giving up, let's log the DOM structure for debugging
                console.log('Variable inputs in DOM:', document.querySelectorAll('.variable-input'));
                console.log('All inputs:', document.querySelectorAll('input'));
                
                // For default variables, try a more radical approach - find anything that looks close
                const allInputs = document.querySelectorAll('input');
                for (const input of allInputs) {
                    const inputId = input.id || '';
                    const inputName = input.name || '';
                    const inputPlaceholder = input.placeholder || '';
                    
                    if (inputId.includes(oldName) || 
                        inputName.includes(oldName) || 
                        inputPlaceholder.includes(oldName) ||
                        input.value === value) {
                        
                        console.log('Found a potential match by partial matching:', input);
                        
                        // Update this input
                        input.value = value;
                        
                        if (oldName !== newName) {
                            // Try to update its attributes
                            if (inputId) input.id = inputId.replace(oldName, newName);
                            if (inputName) input.name = inputName.replace(oldName, newName);
                            if (inputPlaceholder) input.placeholder = inputPlaceholder.replace(oldName, newName);
                            
                            // Try to update any associated label
                            const container = input.closest('.variable-input');
                            if (container) {
                                const label = container.querySelector('label');
                                if (label) {
                                    const displayName = newName.charAt(0).toUpperCase() + newName.slice(1);
                                    label.textContent = `${displayName}:`;
                                }
                            }
                        }
                        
                        // Close modal and exit
                        this.closeModal('editVariableModal');
                        console.log(`Updated variable by partial matching: ${oldName} -> ${newName}`);
                        return;
                    }
                }
                
                this.showError(`Could not find variable "${oldName}" in the DOM`);
            }
        } catch (error) {
            console.error('Error in client-side variable update:', error);
            this.showError('Error updating variable: ' + error.message);
        }
    }
    
    /**
     * Delete a variable
     * @param {string} name - Variable name to delete
     */
    deleteVariable(name) {
        // Check if this is a default variable (which shouldn't be deleted)
        if (this.isDefaultVariable(name)) {
            console.log(`Attempted to delete default variable: ${name}`);
            this.showError(`Cannot delete system variable "${name}"`);
            return;
        }
        
        // Client-side implementation - just remove the variable from the DOM
        console.log(`Client-side deletion of variable: ${name}`);
        
        try {
            // Find and remove the variable from the DOM
            const variableElement = document.querySelector(`.variable-input input[data-variable-name="${name}"]`);
            if (variableElement && variableElement.closest('.variable-input')) {
                variableElement.closest('.variable-input').remove();
                
                // Remove from our internal variables list
                if (this.variables[name]) {
                    delete this.variables[name];
                }
                
                // Close the modal if it's open
                this.closeModal('editVariableModal');
                
                console.log(`Successfully deleted variable ${name} (client-side only)`);
            } else {
                this.showError(`Could not find variable "${name}" in the DOM`);
            }
        } catch (error) {
            console.error('Error in client-side variable deletion:', error);
            this.showError('Error deleting variable: ' + error.message);
        }
    }
    
    /**
     * Refresh the variable list from the server
     */
    refreshVariableList() {
        // Using direct endpoint to bypass routing issues
        const apiUrl = `${this.apiBaseUrl}api/variables/list-direct`.replace(/([^:]\/)\/+/g, '$1');
        console.log('Refreshing variables with URL:', apiUrl);
        
        fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.html) {
                // Append to the variable-inputs container
                if (this.variableInputsContainer) {
                    // First, remove existing custom variables
                    const existingCustomVars = this.variableInputsContainer.querySelectorAll('.variable-input.custom-variable');
                    existingCustomVars.forEach(item => item.remove());
                    
                    // Add the new HTML to the grid container
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = data.html;
                    
                    // Append each custom variable to the container
                    while (tempDiv.firstChild) {
                        this.variableInputsContainer.appendChild(tempDiv.firstChild);
                    }
                    
                    // Re-load variables from DOM
                    this.loadVariables();
                    
                    // Dispatch event for other components
                    document.dispatchEvent(new CustomEvent('variablesRefreshed', {
                        detail: { variables: this.variables }
                    }));
                }
            }
        })
        .catch(error => {
            console.error('Error refreshing variables:', error);
        });
    }
    
    /**
     * Close a modal
     * @param {string} modalId - ID of the modal to close
     */
    closeModal(modalId) {
        // Use modal controller if available
        if (window.modalController) {
            window.modalController.closeModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        }
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    showError(message) {
        if (window.showError) {
            window.showError(message);
        } else if (window.modalController) {
            window.modalController.showError(message);
        } else {
            console.error(message);
            alert(message);
        }
    }
    
    /**
     * Get a {varName: value} map of all current variables
     * @returns {Object}
     */
    getVariableMap() {
        const map = {};
        for (const [name, obj] of Object.entries(this.variables)) {
            map[name] = obj.value;
        }
        return map;
    }
    
    /**
     * Setup the hold-to-delete functionality for the delete variable button
     * @param {HTMLElement} deleteBtn - The delete button element
     * @param {string} variableName - The name of the variable to delete
     */
    setupHoldToDeleteButton(deleteBtn, variableName) {
        const HOLD_TIME = 3000; // 3 seconds in milliseconds
        
        if (!deleteBtn) return;
        
        const progressBar = deleteBtn.querySelector('.delete-progress');
        const countdownEl = deleteBtn.querySelector('.delete-countdown');
        
        // Clear any existing event listeners
        deleteBtn.replaceWith(deleteBtn.cloneNode(true));
        const newDeleteBtn = document.getElementById('deleteVariableBtn');
        
        if (!newDeleteBtn || !progressBar || !countdownEl) return;
        
        let holdStartTime = 0;
        let holdTimer = null;
        let animationFrameId = null;
        
        // Handle mouse down - start hold timer
        newDeleteBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // Prevent accidental double-clicks
            if (holdTimer !== null) return;
            
            holdStartTime = Date.now();
            newDeleteBtn.classList.add('delete-active');
            
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
                console.log('Delete variable button held for required time');
                this.deleteVariable(variableName);
                this.closeModal('editVariableModal');
                this.resetDeleteButton(newDeleteBtn, progressBar, countdownEl);
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
                
                this.resetDeleteButton(newDeleteBtn, progressBar, countdownEl);
            }
        };
        
        newDeleteBtn.addEventListener('mouseup', cancelDelete);
        newDeleteBtn.addEventListener('mouseleave', cancelDelete);
        
        // Touch events for mobile support
        newDeleteBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Prevent accidental double-touches
            if (holdTimer !== null) return;
            
            holdStartTime = Date.now();
            newDeleteBtn.classList.add('delete-active');
            
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
                console.log('Delete variable button held for required time');
                this.deleteVariable(variableName);
                this.closeModal('editVariableModal');
                this.resetDeleteButton(newDeleteBtn, progressBar, countdownEl);
            }, HOLD_TIME);
        });
        
        newDeleteBtn.addEventListener('touchend', cancelDelete);
        newDeleteBtn.addEventListener('touchcancel', cancelDelete);
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
     * Setup variable search functionality
     */
    setupVariableSearch() {
        const searchInput = document.getElementById('variableSearch');
        
        if (!searchInput) return;
        
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const variables = document.querySelectorAll('.variable-input');
            
            variables.forEach(variable => {
                const label = variable.querySelector('label');
                const input = variable.querySelector('input');
                const labelText = label ? label.textContent.toLowerCase() : '';
                const inputValue = input ? input.value.toLowerCase() : '';
                
                const isMatch = labelText.includes(searchTerm) || 
                                inputValue.includes(searchTerm);
                
                variable.style.display = isMatch ? 'flex' : 'none';
            });
        });
    }
}

// Export for use in other modules
export default VariableManager;
