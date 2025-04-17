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
        this.NOTES_SIZE_KEY = 'commandwave_notes_size';
        
        // Default note size (small, medium, large)
        this.noteSize = localStorage.getItem(this.NOTES_SIZE_KEY) || 'medium';
        
        // Debounce timer for auto-save
        this.debounceTimer = null;
    }
    
    /**
     * Initialize notes manager
     */
    init() {
        try {
            // Log element availability for debugging
            console.log('NotesManager initializing with elements:', {
                globalNotesBtn: !!this.globalNotesBtn,
                tabNotesBtn: !!this.tabNotesBtn,
                globalNotesPanel: !!this.globalNotesPanel,
                tabNotesPanel: !!this.tabNotesPanel,
                globalNotesTextarea: !!this.globalNotesTextarea,
                tabNotesTextarea: !!this.tabNotesTextarea,
            });
            
            this.setupEventListeners();
            this.loadGlobalNotes();
            this.applyNoteSize();
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
            this.globalNotesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleGlobalNotes();
            });
        }
        
        // Tab notes button
        if (this.tabNotesBtn) {
            this.tabNotesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTabNotes();
            });
        }
        
        // Close buttons
        this.closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
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
            console.log('Toggling global notes panel');
            
            // Get current state using computed style to be sure
            const computedStyle = window.getComputedStyle(this.globalNotesPanel);
            const isVisible = computedStyle.right === '0px';
            console.log('Current visibility computed style:', computedStyle.right);
            
            // Close tab notes if open
            if (this.tabNotesPanel) {
                this.tabNotesPanel.classList.remove('visible');
                this.saveTabNotes();
            }
            
            // Direct style manipulation as a fallback
            if (!isVisible) {
                this.globalNotesPanel.style.right = '0px';
                this.globalNotesPanel.classList.add('visible');
                console.log('Added visible class and set style.right=0');
                
                // Load notes
                this.loadGlobalNotes();
                
                // Focus textarea
                if (this.globalNotesTextarea) {
                    setTimeout(() => this.globalNotesTextarea.focus(), 100);
                }
            } else {
                // Get the correct hidden position based on size
                const hiddenRight = `-${this.globalNotesPanel.offsetWidth}px`;
                this.globalNotesPanel.style.right = hiddenRight;
                this.globalNotesPanel.classList.remove('visible');
                console.log('Removed visible class and set style.right=' + hiddenRight);
                
                // Save notes
                this.saveGlobalNotes();
            }
        } else {
            console.error('Global notes panel element not found');
        }
    }
    
    /**
     * Toggle tab notes panel
     */
    toggleTabNotes() {
        if (this.tabNotesPanel) {
            console.log('Toggling tab notes panel');
            
            // Get current state using computed style to be sure
            const computedStyle = window.getComputedStyle(this.tabNotesPanel);
            const isVisible = computedStyle.right === '0px';
            console.log('Current visibility computed style:', computedStyle.right);
            
            // Close global notes if open
            if (this.globalNotesPanel) {
                this.globalNotesPanel.classList.remove('visible');
                this.saveGlobalNotes();
            }
            
            // Direct style manipulation as a fallback
            if (!isVisible) {
                this.tabNotesPanel.style.right = '0px';
                this.tabNotesPanel.classList.add('visible');
                console.log('Added visible class and set style.right=0');
                
                // Get current tab port
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab) {
                    this.currentTabPort = activeTab.getAttribute('data-port');
                    this.updateTabNameDisplay(activeTab.textContent || 'Terminal');
                }
                
                // Load notes
                this.loadTabNotes();
                
                // Focus textarea
                if (this.tabNotesTextarea) {
                    setTimeout(() => this.tabNotesTextarea.focus(), 100);
                }
            } else {
                // Get the correct hidden position based on size
                const hiddenRight = `-${this.tabNotesPanel.offsetWidth}px`;
                this.tabNotesPanel.style.right = hiddenRight;
                this.tabNotesPanel.classList.remove('visible');
                console.log('Removed visible class and set style.right=' + hiddenRight);
                
                // Save notes
                this.saveTabNotes();
            }
        } else {
            console.error('Tab notes panel element not found');
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
    
    /**
     * Apply the current note size to panels
     */
    applyNoteSize() {
        if (this.globalNotesPanel && this.tabNotesPanel) {
            // Remove existing size classes
            this.globalNotesPanel.classList.remove('size-small', 'size-medium', 'size-large');
            this.tabNotesPanel.classList.remove('size-small', 'size-medium', 'size-large');
            
            // Add current size class
            this.globalNotesPanel.classList.add(`size-${this.noteSize}`);
            this.tabNotesPanel.classList.add(`size-${this.noteSize}`);
            
            // Set proper right offsets when panel is hidden
            const sizeWidths = {
                small: 300,
                medium: 400,
                large: 550
            };
            
            const width = sizeWidths[this.noteSize] || 400;
            
            // Override default CSS with inline styles as a fallback
            if (!this.globalNotesPanel.classList.contains('visible')) {
                this.globalNotesPanel.style.right = `-${width}px`;
            }
            
            if (!this.tabNotesPanel.classList.contains('visible')) {
                this.tabNotesPanel.style.right = `-${width}px`;
            }
        }
    }
    
    /**
     * Set a new note size and save it
     * @param {string} size - The note size (small, medium, large)
     */
    setNoteSize(size) {
        if (['small', 'medium', 'large'].includes(size)) {
            this.noteSize = size;
            localStorage.setItem(this.NOTES_SIZE_KEY, size);
            this.applyNoteSize();
            console.log(`Note size set to ${size}`);
        }
    }
}
