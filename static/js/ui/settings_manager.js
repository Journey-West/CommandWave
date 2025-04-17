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
            about: document.getElementById('aboutMenuItem')
        };
        
        // Initialize settings system
        this.init();
    }
    
    /**
     * Initialize settings functionality
     */
    init() {
        this.setupSettingsDropdown();
        this.setupMenuItems();
        
        console.log('Settings manager initialized');
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
