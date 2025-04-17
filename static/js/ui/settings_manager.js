/**
 * Settings Manager Module
 * Manages settings dropdown and related functionality
 */

export default class SettingsManager {
    constructor() {
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsDropdown = document.getElementById('settingsDropdown');
        this.menuItems = {
            tutorials: document.getElementById('tutorialsMenuItem'),
            theme: document.getElementById('themeMenuItem'),
            about: document.getElementById('aboutMenuItem'),
            noteSize: document.getElementById('noteSizeMenuItem')
        };
        
        // Note size modal elements
        this.noteSizeModal = document.getElementById('noteSizeModal');
        this.sizeOptions = this.noteSizeModal ? this.noteSizeModal.querySelectorAll('.size-option') : [];
        this.saveSizeBtn = document.getElementById('saveSizeBtn');
        this.cancelSizeBtn = document.getElementById('cancelSizeBtn');
        
        // Selected size (will be set when modal opens)
        this.selectedSize = null;
    }
    
    /**
     * Initialize settings functionality
     */
    init() {
        try {
            this.setupSettingsDropdown();
            this.setupMenuItems();
            
            console.log('Settings manager initialized');
        } catch (error) {
            console.error('Error initializing settings manager:', error);
        }
    }
    
    /**
     * Set up the settings dropdown toggle functionality
     */
    setupSettingsDropdown() {
        if (this.settingsBtn && this.settingsDropdown) {
            // Toggle dropdown when clicking settings button
            this.settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                this.settingsDropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking elsewhere
            document.addEventListener('click', (e) => {
                if (!this.settingsBtn.contains(e.target) && !this.settingsDropdown.contains(e.target)) {
                    this.settingsDropdown.classList.remove('show');
                }
            });
        }
    }
    
    /**
     * Set up menu item click handlers
     */
    setupMenuItems() {
        // Theme menu item
        if (this.menuItems.theme) {
            this.menuItems.theme.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Close dropdown
                this.settingsDropdown.classList.remove('show');
                
                // Show theme modal using available modal controller
                if (window.CommandWave && window.CommandWave.modalController) {
                    window.CommandWave.modalController.openModal('themeModal');
                } else {
                    // Fallback
                    const themeModal = document.getElementById('themeModal');
                    if (themeModal) {
                        themeModal.classList.add('active');
                    }
                }
            });
        }
        
        // Note Size menu item
        if (this.menuItems.noteSize) {
            this.menuItems.noteSize.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Close dropdown
                this.settingsDropdown.classList.remove('show');
                
                // Show note size modal
                this.openNoteSizeModal();
            });
        }
        
        // About menu item
        if (this.menuItems.about) {
            this.menuItems.about.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Close dropdown
                this.settingsDropdown.classList.remove('show');
                
                // Show about modal using available modal controller
                if (window.CommandWave && window.CommandWave.modalController) {
                    window.CommandWave.modalController.openModal('aboutModal');
                } else {
                    // Fallback
                    const aboutModal = document.getElementById('aboutModal');
                    if (aboutModal) {
                        aboutModal.classList.add('active');
                    }
                }
            });
        }
        
        // Tutorials menu item
        if (this.menuItems.tutorials) {
            this.menuItems.tutorials.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Close dropdown
                this.settingsDropdown.classList.remove('show');
                
                // Show tutorials modal or page
                // Currently a placeholder for future implementation
                console.log('Tutorials functionality not yet implemented');
            });
        }
        
        // Set up note size modal handlers
        this.setupNoteSizeModal();
    }
    
    /**
     * Set up handlers for the note size modal
     */
    setupNoteSizeModal() {
        // Handle size option selection
        this.sizeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                this.sizeOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Store selected size
                this.selectedSize = option.getAttribute('data-size');
            });
        });
        
        // Save button handler
        if (this.saveSizeBtn) {
            this.saveSizeBtn.addEventListener('click', () => {
                this.saveNoteSize();
            });
        }
        
        // Cancel button handler
        if (this.cancelSizeBtn) {
            this.cancelSizeBtn.addEventListener('click', () => {
                this.closeNoteSizeModal();
            });
        }
    }
    
    /**
     * Open the note size modal
     */
    openNoteSizeModal() {
        if (window.CommandWave && window.CommandWave.modalController) {
            window.CommandWave.modalController.openModal('noteSizeModal');
            
            // Get current size from NotesManager
            let currentSize = 'medium';
            if (window.CommandWave && window.CommandWave.notesManager) {
                currentSize = window.CommandWave.notesManager.noteSize;
            }
            
            // Update selected UI state
            this.sizeOptions.forEach(option => {
                const size = option.getAttribute('data-size');
                if (size === currentSize) {
                    option.classList.add('selected');
                    this.selectedSize = size;
                } else {
                    option.classList.remove('selected');
                }
            });
        } else {
            // Fallback if modal controller not available
            if (this.noteSizeModal) {
                this.noteSizeModal.classList.add('active');
            }
        }
    }
    
    /**
     * Close the note size modal
     */
    closeNoteSizeModal() {
        if (window.CommandWave && window.CommandWave.modalController) {
            window.CommandWave.modalController.closeModal('noteSizeModal');
        } else {
            // Fallback if modal controller not available
            if (this.noteSizeModal) {
                this.noteSizeModal.classList.remove('active');
            }
        }
    }
    
    /**
     * Save the selected note size
     */
    saveNoteSize() {
        if (this.selectedSize && window.CommandWave && window.CommandWave.notesManager) {
            // Update size in NotesManager
            window.CommandWave.notesManager.setNoteSize(this.selectedSize);
            
            // Close modal
            this.closeNoteSizeModal();
            
            console.log(`Note panel size set to: ${this.selectedSize}`);
        } else {
            console.error('Could not save note size: NotesManager not available or no size selected');
        }
    }
    
    /**
     * Toggle the settings dropdown
     * @param {boolean} show - Whether to show or hide the dropdown
     */
    toggleDropdown(show) {
        if (this.settingsDropdown) {
            if (show === undefined) {
                this.settingsDropdown.classList.toggle('show');
            } else if (show) {
                this.settingsDropdown.classList.add('show');
            } else {
                this.settingsDropdown.classList.remove('show');
            }
        }
    }
}
