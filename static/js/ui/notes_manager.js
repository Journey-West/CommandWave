/**
 * NotesManager - Module for handling notes functionality
 * Controls global notes and tab-specific notes
 */
export default class NotesManager {
    constructor() {
        // Note buttons
        this.globalNotesBtn = document.getElementById('globalNotesBtn');
        this.tabNotesBtn = document.getElementById('tabNotesBtn');
        
        // Note panels
        this.globalNotesPanel = document.getElementById('globalNotesPanel');
        this.tabNotesPanel = document.getElementById('tabNotesPanel');
        
        // Note textareas - use correct IDs from HTML
        this.globalNotesTextarea = document.getElementById('globalNotesText');
        this.tabNotesTextarea = document.getElementById('tabNotesText');
        
        // Current tab name element
        this.currentTabNameEl = document.getElementById('currentTabName');
        
        // Close buttons
        this.closeButtons = document.querySelectorAll('.close-notes-btn');
        
        // Current active tab port (for tab-specific notes)
        this.currentTabPort = null;
        
        // Storage keys
        this.GLOBAL_NOTES_KEY = 'commandwave_global_notes';
        this.TAB_NOTES_PREFIX = 'commandwave_tab_notes_';
        
        // Debounce timer for auto-save
        this.debounceTimer = null;
    }
    
    /**
     * Initialize notes manager
     */
    init() {
        try {
            this.setupEventListeners();
            this.loadGlobalNotes();
            console.log('Notes manager initialized');
        } catch (error) {
            console.error('Error initializing notes manager:', error);
        }
    }
    
    /**
     * Setup event listeners for notes buttons and panels
     */
    setupEventListeners() {
        // Global notes button
        if (this.globalNotesBtn) {
            this.globalNotesBtn.addEventListener('click', () => this.toggleGlobalNotes());
        }
        
        // Tab notes button
        if (this.tabNotesBtn) {
            this.tabNotesBtn.addEventListener('click', () => this.toggleTabNotes());
        }
        
        // Close buttons
        this.closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.target.closest('.notes-panel');
                if (panel) {
                    panel.classList.remove('visible');
                    
                    // Save notes on close
                    if (panel.id === 'globalNotesPanel') {
                        this.saveGlobalNotes();
                    } else if (panel.id === 'tabNotesPanel') {
                        this.saveTabNotes();
                    }
                }
            });
        });
        
        // Auto-save global notes when typing
        if (this.globalNotesTextarea) {
            this.globalNotesTextarea.addEventListener('input', () => {
                this.debounce(() => this.saveGlobalNotes(), 500);
            });
        }
        
        // Auto-save tab notes when typing
        if (this.tabNotesTextarea) {
            this.tabNotesTextarea.addEventListener('input', () => {
                this.debounce(() => this.saveTabNotes(), 500);
            });
        }
        
        // Listen for tab changes from terminal manager
        document.addEventListener('terminal-tab-changed', (e) => {
            if (e.detail && e.detail.port) {
                this.handleTabChange(e.detail.port);
            }
        });
        
        // Initial tab detection
        this.detectCurrentTab();
    }
    
    /**
     * Detect current active terminal tab
     */
    detectCurrentTab() {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const port = activeTab.getAttribute('data-port');
            if (port) {
                this.currentTabPort = port;
                this.updateTabNameDisplay(activeTab.textContent || 'Terminal');
            }
        }
    }
    
    /**
     * Update the tab name display in the notes panel
     * @param {string} name - Tab name to display
     */
    updateTabNameDisplay(name) {
        if (this.currentTabNameEl) {
            this.currentTabNameEl.textContent = name;
        }
    }
    
    /**
     * Debounce function to limit frequency of calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     */
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }
    
    /**
     * Toggle global notes panel
     */
    toggleGlobalNotes() {
        if (this.globalNotesPanel) {
            const isVisible = this.globalNotesPanel.classList.contains('visible');
            
            // Close tab notes if open
            if (this.tabNotesPanel && this.tabNotesPanel.classList.contains('visible')) {
                this.tabNotesPanel.classList.remove('visible');
                this.saveTabNotes();
            }
            
            // Toggle global notes
            this.globalNotesPanel.classList.toggle('visible');
            
            // Load notes if opening
            if (!isVisible) {
                this.loadGlobalNotes();
                
                // Focus textarea
                if (this.globalNotesTextarea) {
                    setTimeout(() => this.globalNotesTextarea.focus(), 100);
                }
            } else {
                // Save notes if closing
                this.saveGlobalNotes();
            }
        }
    }
    
    /**
     * Toggle tab notes panel
     */
    toggleTabNotes() {
        if (this.tabNotesPanel) {
            const isVisible = this.tabNotesPanel.classList.contains('visible');
            
            // Close global notes if open
            if (this.globalNotesPanel && this.globalNotesPanel.classList.contains('visible')) {
                this.globalNotesPanel.classList.remove('visible');
                this.saveGlobalNotes();
            }
            
            // Toggle tab notes
            this.tabNotesPanel.classList.toggle('visible');
            
            // Get current tab port
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                this.currentTabPort = activeTab.getAttribute('data-port');
                this.updateTabNameDisplay(activeTab.textContent || 'Terminal');
            }
            
            // Load notes if opening
            if (!isVisible) {
                this.loadTabNotes();
                
                // Focus textarea
                if (this.tabNotesTextarea) {
                    setTimeout(() => this.tabNotesTextarea.focus(), 100);
                }
            } else {
                // Save notes if closing
                this.saveTabNotes();
            }
        }
    }
    
    /**
     * Handle tab change from terminal manager
     * @param {string} port - Port of the new active tab
     */
    handleTabChange(port) {
        this.currentTabPort = port;
        
        // Update tab name in the notes panel
        const activeTab = document.querySelector(`.tab-btn[data-port="${port}"]`);
        if (activeTab) {
            this.updateTabNameDisplay(activeTab.textContent || 'Terminal');
        }
        
        // If tab notes are open, load notes for the new tab
        if (this.tabNotesPanel && this.tabNotesPanel.classList.contains('visible')) {
            this.loadTabNotes();
        }
    }
    
    /**
     * Load global notes from localStorage
     */
    loadGlobalNotes() {
        if (this.globalNotesTextarea) {
            const notes = localStorage.getItem(this.GLOBAL_NOTES_KEY) || '';
            this.globalNotesTextarea.value = notes;
        }
    }
    
    /**
     * Save global notes to localStorage
     */
    saveGlobalNotes() {
        if (this.globalNotesTextarea) {
            localStorage.setItem(this.GLOBAL_NOTES_KEY, this.globalNotesTextarea.value);
            console.log('Global notes saved');
        }
    }
    
    /**
     * Load tab-specific notes from localStorage
     */
    loadTabNotes() {
        if (this.tabNotesTextarea && this.currentTabPort) {
            const key = this.TAB_NOTES_PREFIX + this.currentTabPort;
            const notes = localStorage.getItem(key) || '';
            this.tabNotesTextarea.value = notes;
        }
    }
    
    /**
     * Save tab-specific notes to localStorage
     */
    saveTabNotes() {
        if (this.tabNotesTextarea && this.currentTabPort) {
            const key = this.TAB_NOTES_PREFIX + this.currentTabPort;
            localStorage.setItem(key, this.tabNotesTextarea.value);
            console.log(`Notes saved for tab ${this.currentTabPort}`);
        }
    }
}
