/**
 * notification_manager.js - UI module for notification system
 * Provides a stylish, non-intrusive toast notification system
 */

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationContainer');
        this.notifications = [];
        this.counter = 0;
        
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
            console.warn('Notification container not found, created dynamically');
        }
    }
    
    /**
     * Show a notification toast
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     * @param {number} duration - Duration in ms before auto-close (0 for no auto-close)
     * @returns {string} Notification ID
     */
    show(title, message, type = 'info', duration = 5000) {
        const id = `notification-${++this.counter}`;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Close notification">&times;</button>
        `;
        
        // Add to container
        this.container.appendChild(notification);
        
        // Store reference
        this.notifications.push({
            id,
            element: notification,
            timer: duration > 0 ? setTimeout(() => this.close(id), duration) : null
        });
        
        // Add click listener for close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(id));
        }
        
        // Add click listener for the notification itself
        notification.addEventListener('click', (e) => {
            // Only close if clicking on the notification itself, not on any buttons
            if (e.target === notification || e.target.classList.contains('notification-content') || 
                e.target.classList.contains('notification-title') || e.target.classList.contains('notification-message')) {
                this.close(id);
            }
        });
        
        // Return ID for reference
        return id;
    }
    
    /**
     * Close a notification by ID
     * @param {string} id - Notification ID
     */
    close(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index >= 0) {
            const notification = this.notifications[index];
            
            // Clear any existing timer
            if (notification.timer) {
                clearTimeout(notification.timer);
            }
            
            // Add closing animation
            notification.element.classList.add('closing');
            
            // Remove after animation completes
            setTimeout(() => {
                if (notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
                this.notifications.splice(index, 1);
            }, 300); // Match this with the CSS animation duration
        }
    }
    
    /**
     * Show a success notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} duration - Duration in ms before auto-close (0 for no auto-close)
     * @returns {string} Notification ID
     */
    success(title, message, duration = 5000) {
        return this.show(title, message, 'success', duration);
    }
    
    /**
     * Show an error notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} duration - Duration in ms before auto-close (0 for no auto-close)
     * @returns {string} Notification ID
     */
    error(title, message, duration = 8000) {
        return this.show(title, message, 'error', duration);
    }
    
    /**
     * Show an info notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} duration - Duration in ms before auto-close (0 for no auto-close)
     * @returns {string} Notification ID
     */
    info(title, message, duration = 5000) {
        return this.show(title, message, 'info', duration);
    }
    
    /**
     * Close all notifications
     */
    closeAll() {
        [...this.notifications].forEach(notification => {
            this.close(notification.id);
        });
    }
}

// Export as a singleton
export default new NotificationManager();
