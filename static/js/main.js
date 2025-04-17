/**
 * CommandWave - Main JavaScript Entry Point
 * 
 * This file serves as the entry point for the CommandWave application.
 * It initializes all required modules and sets up the application.
 */

// Import core modules
import ThemeManager from './ui/theme_manager.js';
import TerminalManager from './ui/terminal_manager.js';
import ModalController from './ui/modal_controller.js';
import VariableManager from './ui/variable_manager.js';
import SettingsManager from './ui/settings_manager.js';
import API from './api/index.js';
import ErrorHandler from './utils/error_handler.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('CommandWave initializing...');
    
    try {
        // Application config
        const config = {
            hostname: window.location.hostname,
            defaultPort: document.querySelector('.tab-btn[data-port]')?.getAttribute('data-port')
        };
        
        // First, check and prepare all modals
        document.querySelectorAll('.modal, .modal-container').forEach(modal => {
            console.log('Found modal:', modal.id);
        });
        
        // Initialize Modal Controller (needed by other components for notifications)
        const modalController = new ModalController();
        
        // Connect error handler with modal controller
        ErrorHandler.setModalController(modalController);
        
        // Initialize UI Managers
        const themeManager = new ThemeManager();
        const terminalManager = new TerminalManager(config.hostname);
        const variableManager = new VariableManager();
        const settingsManager = new SettingsManager();
        
        // Make modules available globally for debugging
        window.CommandWave = {
            themeManager,
            terminalManager,
            modalController,
            variableManager,
            settingsManager,
            api: API,
            errorHandler: ErrorHandler,
            version: '0.2.0' // Modular architecture version
        };
        
        // Register additional modal events after making the components globally available
        // This ensures proper event handling between components
        const newTerminalBtn = document.getElementById('addTabBtn');
        if (newTerminalBtn) {
            newTerminalBtn.addEventListener('click', function() {
                console.log('Add tab button clicked directly from main.js');
                modalController.openModal('newTerminalModal');
            });
        }
        
        // Setup global error handling for uncaught exceptions
        window.addEventListener('error', (event) => {
            ErrorHandler.handleError(event.error || new Error(event.message), 
                'Uncaught Exception', true, true);
            
            // Don't prevent default error handling
            return false;
        });
        
        // Setup global rejection handling for unhandled promises
        window.addEventListener('unhandledrejection', (event) => {
            ErrorHandler.handleError(event.reason || new Error('Unhandled Promise Rejection'),
                'Unhandled Promise', true, false);
            
            // Don't prevent default error handling
            return false;
        });
        
        console.log('CommandWave initialized.');
    } catch (error) {
        console.error('Failed to initialize CommandWave:', error);
        alert(`Failed to initialize CommandWave: ${error.message}`);
    }
});
