/**
 * Error Handler Module
 * Provides centralized error handling with notification capabilities
 */

class ErrorHandler {
    constructor() {
        this.errorContainer = null;
        this.modalController = null;
        this.setupErrorContainer();
    }
    
    /**
     * Set up the error container for notifications
     */
    setupErrorContainer() {
        // Check if container already exists
        let container = document.getElementById('error-notification-container');
        
        // Create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-notification-container';
            container.className = 'error-notification-container';
            document.body.appendChild(container);
            
            // Add styles if not already in CSS
            if (!document.getElementById('error-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'error-notification-styles';
                style.textContent = `
                    .error-notification-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 9999;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        max-width: 350px;
                    }
                    .error-notification {
                        background: var(--notification-error-bg, rgba(220, 53, 69, 0.95));
                        color: var(--notification-error-text, #fff);
                        padding: 12px 16px;
                        border-radius: 4px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                        margin-bottom: 8px;
                        animation: slideIn 0.3s ease-out forwards;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .error-notification-content {
                        flex: 1;
                    }
                    .error-notification-close {
                        background: transparent;
                        border: none;
                        color: inherit;
                        font-size: 18px;
                        cursor: pointer;
                        margin-left: 8px;
                        opacity: 0.8;
                    }
                    .error-notification-close:hover {
                        opacity: 1;
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                    .error-notification.closing {
                        animation: slideOut 0.3s ease-in forwards;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        this.errorContainer = container;
    }
    
    /**
     * Set a reference to the modal controller
     * @param {object} modalController - The modal controller instance
     */
    setModalController(modalController) {
        this.modalController = modalController;
    }
    
    /**
     * Handle an error with appropriate logging and user notification
     * @param {Error|string} error - The error object or message
     * @param {string} context - Context where the error occurred
     * @param {boolean} showNotification - Whether to show a notification to the user
     * @param {boolean} showModal - Whether to show a modal dialog for critical errors
     */
    handleError(error, context = 'Application', showNotification = true, showModal = false) {
        // Extract error message
        const errorMessage = error instanceof Error ? error.message : error;
        
        // Log to console with context
        console.error(`${context} Error:`, error);
        
        // Show notification if requested
        if (showNotification) {
            this.showErrorNotification(errorMessage, context);
        }
        
        // Show modal for critical errors if requested
        if (showModal && this.modalController) {
            this.modalController.openModal('errorModal', {
                title: `${context} Error`,
                message: errorMessage,
                stack: error instanceof Error ? error.stack : null
            });
        }
        
        // Return the error to allow for chaining/rethrowing
        return error;
    }
    
    /**
     * Show an error notification to the user
     * @param {string} message - Error message to display
     * @param {string} context - Context of the error
     * @param {number} duration - How long to show the notification in ms (0 for no auto-close)
     */
    showErrorNotification(message, context = 'Error', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        
        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'error-notification-content';
        
        // Add context as title if provided
        if (context) {
            const title = document.createElement('strong');
            title.textContent = context;
            content.appendChild(title);
            content.appendChild(document.createElement('br'));
        }
        
        // Add message
        const messageText = document.createTextNode(message);
        content.appendChild(messageText);
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'error-notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.removeNotification(notification));
        
        // Assemble and append notification
        notification.appendChild(content);
        notification.appendChild(closeBtn);
        this.errorContainer.appendChild(notification);
        
        // Auto-remove after duration (if not 0)
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    /**
     * Remove a notification with animation
     * @param {HTMLElement} notification - The notification element to remove
     */
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        // Add closing class to animate
        notification.classList.add('closing');
        
        // Remove after animation completes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300); // Match animation duration
    }
    
    /**
     * Create an API error handler that wraps API calls with error handling
     * @param {string} context - The context for errors (e.g., 'Terminal API')
     * @returns {Function} A function that wraps API calls with error handling
     */
    createApiErrorHandler(context) {
        return async (apiCall) => {
            try {
                return await apiCall();
            } catch (error) {
                return this.handleError(error, context, true, false);
            }
        };
    }
}

// Export as singleton
export default new ErrorHandler();
