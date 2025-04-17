// main.js
// Entry point for CommandWave frontend logic. Imports UI modules, API modules, and utilities.

// Import UI modules
import ThemeManager from './ui/theme_manager.js';
import TerminalManager from './ui/terminal_manager.js';
import ModalController from './ui/modal_controller.js';
import VariableManager from './ui/variable_manager.js';

// Initialize modules when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('CommandWave initializing...');
    
    // Initialize the theme manager
    const themeManager = new ThemeManager();
    window.themeManager = themeManager; // Make available globally for legacy code
    
    // Initialize the terminal manager
    const terminalManager = new TerminalManager();
    window.terminalManager = terminalManager; // Make available globally for legacy code
    
    // Initialize the modal controller
    const modalController = new ModalController();
    window.modalController = modalController; // Make available globally for legacy code
    
    // Initialize the variable manager
    const variableManager = new VariableManager();
    window.variableManager = variableManager; // Make available globally for legacy code
    
    // Add temporary placeholder for old inline script functionality
    // This will be gradually migrated to the appropriate modules
    initializeTemporaryHandlers();
    
    console.log('CommandWave initialized.');
});

/**
 * Temporary function to handle legacy inline script functionality
 * This will be gradually migrated to the proper modules
 */
function initializeTemporaryHandlers() {
    // Terminal tabs functionality has been moved to TerminalManager
    
    // New terminal button has been moved to TerminalManager
    
    // Theme modal open/close has been moved to ThemeManager
    
    // About modal has been moved to ModalController
    
    // Modal close handlers have been moved to ModalController
    
    // Toggle variables section has been moved to VariableManager
    
    // Add variable input has been moved to ModalController and VariableManager
    
    // Settings dropdown toggle
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDropdown = document.getElementById('settingsDropdown');
    if (settingsBtn && settingsDropdown) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling to document
            settingsDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (!settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
                settingsDropdown.classList.remove('show');
            }
        });
    }
    
    // Simple error display function - now delegated to ModalController
    window.showError = function(message) {
        if (window.modalController) {
            window.modalController.showError(message);
        } else {
            const errorModal = document.getElementById('errorModal');
            const errorMessage = document.getElementById('errorMessage');
            
            if (errorModal && errorMessage) {
                errorMessage.textContent = message;
                errorModal.classList.add('active');
            } else {
                alert(message);
            }
        }
    };
}
