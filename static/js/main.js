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
import NotesManager from './ui/notes_manager.js';
import API from './api/index.js';
import ErrorHandler from './utils/error_handler.js';
import VariablesPanel from './ui/variables_panel.js';
import SearchManager from './ui/search_manager.js';
import PlaybookManager from './ui/playbook_manager.js';
import NotificationManager from './ui/notification_manager.js';
import { renderMarkdown } from './utils/markdown.js';
import WebSocketHandler from './sync/websocket_handler.js';
import SyncManager from './sync/sync_manager.js';
import PresenceManager from './ui/presence_manager.js';
import './ui/settings_modal.js';

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
        window.variableManager = new VariableManager();
        const settingsManager = new SettingsManager();
        const notesManager = new NotesManager();
        const variablesPanel = new VariablesPanel();
        const searchManager = new SearchManager();
        const playbookManager = new PlaybookManager();
        const presenceManager = new PresenceManager();
        
        // Make modules available globally for debugging
        window.CommandWave = {
            terminalManager,
            modalController,
            variableManager,
            settingsManager,
            notesManager,
            themeManager,
            api: API,
            errorHandler: ErrorHandler,
            version: '0.2.1', // Updated version with real-time sync
            searchManager,
            variablesPanel,
            playbookManager,
            notificationManager: NotificationManager,
            webSocketHandler: WebSocketHandler,
            syncManager: SyncManager,
            presenceManager
        };
        
        // Initialize modules
        modalController.init();
        terminalManager.init();
        variableManager.init();
        settingsManager.init();
        notesManager.init();
        variablesPanel.init();
        presenceManager.init();
        // searchManager does not have an init method, it self-initializes in the constructor
        // playbookManager initialized in its constructor
        // notificationManager is a singleton that doesn't need initialization
        
        // Initialize Sync Manager with references to other modules
        SyncManager.init({
            terminalManager,
            variableManager,
            playbookManager,
            notesManager,
            presenceManager
        });
        
        // Start WebSocket connection for real-time synchronization
        // Get username from settings or use a default
        try {
            // Make sure we use a default value if getSetting returns null
            const username = settingsManager.getSetting('username') || 'User_' + Math.floor(Math.random() * 1000); 
            SyncManager.connect(username);
        } catch (error) {
            console.warn('Failed to establish WebSocket connection:', error.message);
            // We'll continue without real-time features
        }
        
        // Register additional modal events after making the components globally available
        // This ensures proper event handling between components
        const newTerminalBtn = document.getElementById('addTabBtn');
        if (newTerminalBtn) {
            newTerminalBtn.addEventListener('click', function() {
                console.log('Add tab button clicked directly from main.js');
                modalController.openModal('newTerminalModal');
            });
        }
        
        // --- SEARCH FUNCTIONALITY PATCH ---
        // Attach search event listener directly to input
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', async function() {
                const query = searchInput.value.trim();
                if (query.length < 2) {
                    searchResults.style.display = 'none';
                    searchResults.innerHTML = '';
                    return;
                }
                searchResults.innerHTML = '<div class="search-result-item">Searching...</div>';
                searchResults.style.display = 'block';
                try {
                    const resp = await fetch(`/api/playbooks/search?query=${encodeURIComponent(query)}`);
                    const data = await resp.json();
                    if (data.success && data.results && data.results.length > 0) {
                        searchResults.innerHTML = data.results.map(r =>
                            `<div class=\"search-result-item\">`
                            + `<div class=\"result-header\">`
                            + `<span class=\"filename\">${r.filename}</span>`
                            + `<span class=\"line-number\">${r.line_number}</span>`
                            + `</div>`
                            + `<div class=\"result-line-box\"><span class=\"result-line\">${highlightQuery(r.line, query)}</span></div>`
                            + `</div>`
                        ).join('');
                    } else {
                        searchResults.innerHTML = '<div class="search-result-item">No results found.</div>';
                    }
                } catch (err) {
                    searchResults.innerHTML = '<div class="search-result-item">Error searching.</div>';
                }
            });
        }
        // --- END SEARCH FUNCTIONALITY PATCH ---

        // Highlight query inside results
        function highlightQuery(line, query) {
            if (!query) return line;
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'gi');
            return line.replace(regex, '<span class="search-highlight">$1</span>');
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
