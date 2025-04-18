/**
 * variable_manager.js - Modular variable management for CommandWave
 * Handles variable operations, UI interactions, and state management
 */

class VariableManager {
    constructor() {
        this.variables = {};
        this.sectionCollapsed = false;
        this.variableSectionElement = document.getElementById('variableContent');
        this.variableListElement = document.getElementById('variableList');
        
        // Initialize manager
        this.init();
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
        
        // Set up variable actions (edit, delete)
        this.setupVariableActions();
        
        // Set up add variable button
        this.setupAddVariableButton();
        
        console.log(`Variable manager initialized with ${Object.keys(this.variables).length} variables`);
    }
    
    /**
     * Load variables from DOM
     */
    loadVariables() {
        const variableItems = document.querySelectorAll('.variable-item');
        
        variableItems.forEach(item => {
            const nameElement = item.querySelector('.variable-name');
            const valueElement = item.querySelector('.variable-value');
            
            if (nameElement && valueElement) {
                let name = nameElement.textContent.trim();
                // Strip leading $ if present for internal storage
                if (name.startsWith('$')) {
                    name = name.slice(1);
                }
                const value = valueElement.textContent.trim();
                
                if (name) {
                    this.variables[name] = {
                        value: value,
                        element: item
                    };
                }
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
                this.handleEditVariable(editForm);
            });
        }
    }
    
    /**
     * Set up edit and delete actions for variables
     */
    setupVariableActions() {
        // Use event delegation for variable actions since items may be added/removed
        if (this.variableListElement) {
            this.variableListElement.addEventListener('click', (e) => {
                const target = e.target;
                
                // Edit variable button
                if (target.closest('.edit-variable-btn')) {
                    const variableItem = target.closest('.variable-item');
                    if (variableItem) {
                        const name = variableItem.querySelector('.variable-name')?.textContent.trim();
                        const value = variableItem.querySelector('.variable-value')?.textContent.trim();
                        if (name && value) {
                            this.openEditVariableModal(name, value);
                        }
                    }
                }
                
                // Delete variable button
                if (target.closest('.delete-variable-btn')) {
                    const variableItem = target.closest('.variable-item');
                    if (variableItem) {
                        const name = variableItem.querySelector('.variable-name')?.textContent.trim();
                        if (name) {
                            this.deleteVariable(name);
                        }
                    }
                }
            });
        }
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
     * Open the add variable modal
     */
    openAddVariableModal() {
        if (window.modalController) {
            window.modalController.openModal('addVariableModal');
        } else {
            const modal = document.getElementById('addVariableModal');
            if (modal) {
                modal.classList.add('active');
            }
        }
        
        // Focus on the name input
        setTimeout(() => {
            const nameInput = document.getElementById('variableName');
            if (nameInput) {
                nameInput.focus();
            }
        }, 100);
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
        fetch('/api/variables/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, value })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.closeModal('createVariableModal');
                
                // Refresh variable list
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
        const valueInput = document.getElementById('editVariableValue');
        const oldNameInput = document.getElementById('oldVariableName');
        
        if (editModal && nameInput && valueInput && oldNameInput) {
            nameInput.value = name;
            valueInput.value = value;
            oldNameInput.value = name;
            
            // Use modal controller if available
            if (window.modalController) {
                window.modalController.openModal('editVariableModal');
            } else {
                editModal.classList.add('active');
            }
            
            // Focus the value input
            valueInput.focus();
        }
    }
    
    /**
     * Handle editing a variable
     * @param {HTMLFormElement} form - The form element
     */
    handleEditVariable(form) {
        const nameInput = form.querySelector('#editVariableName');
        const valueInput = form.querySelector('#editVariableValue');
        const oldNameInput = form.querySelector('#oldVariableName');
        
        if (!nameInput || !valueInput || !oldNameInput) return;
        
        let name = nameInput.value.trim();
        const value = valueInput.value.trim();
        let oldName = oldNameInput.value.trim();
        // Strip leading $ if present
        if (name.startsWith('$')) name = name.slice(1);
        if (oldName.startsWith('$')) oldName = oldName.slice(1);
        if (!name) {
            this.showError('Variable name cannot be empty');
            return;
        }
        
        // Edit variable via API
        this.editVariable(oldName, name, value);
    }
    
    /**
     * Edit an existing variable
     * @param {string} oldName - Original variable name
     * @param {string} newName - New variable name
     * @param {string} value - New variable value
     */
    editVariable(oldName, newName, value) {
        fetch('/api/variables/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName, value })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.closeModal('editVariableModal');
                
                // Refresh variable list
                this.refreshVariableList();
            } else {
                this.showError(data.error || 'Failed to update variable');
            }
        })
        .catch(error => {
            this.showError('Error updating variable: ' + error.message);
        });
    }
    
    /**
     * Delete a variable
     * @param {string} name - Variable name to delete
     */
    deleteVariable(name) {
        if (!confirm(`Are you sure you want to delete variable "${name}"?`)) {
            return;
        }
        
        fetch('/api/variables/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Refresh variable list
                this.refreshVariableList();
            } else {
                this.showError(data.error || 'Failed to delete variable');
            }
        })
        .catch(error => {
            this.showError('Error deleting variable: ' + error.message);
        });
    }
    
    /**
     * Refresh the variable list from the server
     */
    refreshVariableList() {
        fetch('/api/variables/list')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.html) {
                if (this.variableListElement) {
                    this.variableListElement.innerHTML = data.html;
                    
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
}

// Export for use in other modules
export default VariableManager;
