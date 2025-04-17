/**
 * modal_controller.js - UI module for modal management
 * Handles showing/hiding modals and modal interactions
 */

import NotificationManager from './notification_manager.js';

class ModalController {
    constructor() {
        this.modalRegistry = {};
        this.activeModal = null;
        this.confirmCallback = null;
        
        // Initialize controller
        this.init();
    }
    
    /**
     * Initialize modal system
     */
    init() {
        // Register all modals
        this.registerModals();
        
        // Set up global handlers
        this.setupGlobalHandlers();
        
        // Debug registered modals
        console.log(`Modal controller initialized with ${Object.keys(this.modalRegistry).length} modals:`, 
                    Object.keys(this.modalRegistry));
    }
    
    /**
     * Find and register all modals in the document
     */
    registerModals() {
        document.querySelectorAll('.modal, .modal-container').forEach(modal => {
            const modalId = modal.id;
            if (modalId) {
                this.modalRegistry[modalId] = {
                    element: modal,
                    isActive: modal.classList.contains('active'),
                    triggers: []
                };
            }
        });
        
        // Find all elements that trigger modals
        document.querySelectorAll('[data-modal-target]').forEach(trigger => {
            const targetId = trigger.getAttribute('data-modal-target');
            if (targetId && this.modalRegistry[targetId]) {
                this.modalRegistry[targetId].triggers.push(trigger);
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal(targetId);
                });
            }
        });
        
        // For backward compatibility - handle specific modals that don't use data attributes
        this.setupLegacyTriggers();
        
        // Setup confirmation modal handlers
        this.setupConfirmationModal();
    }
    
    /**
     * Set up legacy modal triggers for backward compatibility
     */
    setupLegacyTriggers() {
        // About modal
        const aboutMenuItem = document.getElementById('aboutMenuItem');
        if (aboutMenuItem && this.modalRegistry['aboutModal']) {
            aboutMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('aboutModal');
            });
        }
        
        // Add variable modal
        const addVariableBtn = document.getElementById('addVariableInput');
        if (addVariableBtn && this.modalRegistry['createVariableModal']) {
            addVariableBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('createVariableModal');
                document.getElementById('newVariableName')?.focus();
            });
        }
    }
    
    /**
     * Set up the confirmation modal handlers
     */
    setupConfirmationModal() {
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) {
            // Confirm button
            const confirmBtn = confirmModal.querySelector('#confirmAction');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.closeModal('confirmModal');
                    if (this.confirmCallback) {
                        this.confirmCallback(true);
                        this.confirmCallback = null;
                    }
                });
            }
            
            // Cancel button
            const cancelBtn = confirmModal.querySelector('#confirmCancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeModal('confirmModal');
                    if (this.confirmCallback) {
                        this.confirmCallback(false);
                        this.confirmCallback = null;
                    }
                });
            }
            
            // Handle clicks outside the modal content
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    this.closeModal('confirmModal');
                    if (this.confirmCallback) {
                        this.confirmCallback(false);
                        this.confirmCallback = null;
                    }
                }
            });
        }
    }
    
    /**
     * Set up global handlers for modals
     */
    setupGlobalHandlers() {
        // Close buttons
        document.querySelectorAll('.modal-close, .modal-btn.cancel').forEach(el => {
            el.addEventListener('click', (e) => {
                // Find the closest modal container
                const modalContainer = el.closest('.modal-container');
                if (modalContainer && modalContainer.id) {
                    this.closeModal(modalContainer.id);
                } else if (this.activeModal) {
                    this.closeModal(this.activeModal);
                } else {
                    // Fallback - close all modals
                    document.querySelectorAll('.modal-container').forEach(modal => {
                        modal.classList.remove('active');
                    });
                }
            });
        });
        
        // Submit buttons (should NOT close modals automatically)
        document.querySelectorAll('.modal-btn.submit').forEach(el => {
            // These buttons should have their own specific handlers
            // added by the relevant component manager
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
                
                // If confirmation modal is open and escape is pressed, trigger cancel
                if (this.activeModal === 'confirmModal' && this.confirmCallback) {
                    this.confirmCallback(false);
                    this.confirmCallback = null;
                }
            }
        });
        
        // Close when clicking outside the modal
        document.querySelectorAll('.modal-container').forEach(modal => {
            if (modal.id !== 'confirmModal') { // Skip confirmModal, handled separately
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal.id);
                    }
                });
            }
        });
    }
    
    /**
     * Show a confirmation dialog with custom modal
     * @param {string} title - Confirmation title
     * @param {string} message - Confirmation message
     * @param {Function} callback - Callback function that receives boolean result
     */
    showConfirmation(title, message, callback) {
        const confirmModal = document.getElementById('confirmModal');
        if (!confirmModal) {
            console.warn('Confirmation modal not found, falling back to browser confirm');
            const result = confirm(message);
            if (callback) {
                callback(result);
            }
            return;
        }
        
        // Set the title and message
        const titleElement = confirmModal.querySelector('#confirmTitle');
        const messageElement = confirmModal.querySelector('#confirmMessage');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // Store the callback
        this.confirmCallback = callback;
        
        // Show the modal
        this.openModal('confirmModal');
    }
    
    /**
     * Open a specific modal
     * @param {string} modalId - ID of the modal to open
     */
    openModal(modalId) {
        const modalInfo = this.modalRegistry[modalId];
        if (!modalInfo) {
            console.error(`Modal ${modalId} not found`);
            return false;
        }
        
        // Close any active modal
        if (this.activeModal) {
            this.closeModal(this.activeModal);
        }
        
        // Open the requested modal
        modalInfo.element.classList.add('active');
        modalInfo.isActive = true;
        this.activeModal = modalId;
        
        // Dispatch modal open event
        document.dispatchEvent(new CustomEvent('modalOpened', {
            detail: { modalId: modalId }
        }));
        
        return true;
    }
    
    /**
     * Close a specific modal
     * @param {string} modalId - ID of the modal to close
     */
    closeModal(modalId) {
        const modalInfo = this.modalRegistry[modalId];
        if (!modalInfo) {
            console.error(`Modal ${modalId} not found`);
            return false;
        }
        
        // Close the modal
        modalInfo.element.classList.remove('active');
        modalInfo.isActive = false;
        
        // Clear active modal if this was it
        if (this.activeModal === modalId) {
            this.activeModal = null;
        }
        
        // Dispatch modal closed event
        document.dispatchEvent(new CustomEvent('modalClosed', {
            detail: { modalId: modalId }
        }));
        
        return true;
    }
    
    /**
     * Show an error message in the error modal
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            this.openModal('errorModal');
            return true;
        }
        
        // Fallback if error modal not found
        console.error(message);
        alert(message);
        return false;
    }
    
    /**
     * Show a notification to the user
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(title, message, type = 'info') {
        if (type === 'error') {
            // Use error modal for critical errors
            this.showError(message);
        } else {
            // Use toast notification for success and info messages
            NotificationManager.show(title, message, type);
        }
    }
}

// Export the class itself (not an instance) for compatibility with main.js
export default ModalController;
