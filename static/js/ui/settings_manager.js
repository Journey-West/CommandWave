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
        
        // Initialize settings storage
        this.settings = this.loadSettings();
    }
    
    /**
     * Initialize settings functionality
     */
    init() {
        // Initialize theme on startup
        const savedTheme = this.settings.theme || 'dark';
        if (window.CommandWave && window.CommandWave.themeManager) {
            window.CommandWave.themeManager.applyTheme(savedTheme);
        }
        // Continue with dropdown and menu setup
        try {
            this.setupSettingsDropdown();
            this.setupMenuItems();
            
            console.log('Settings manager initialized');
        } catch (error) {
            console.error('Error initializing settings manager:', error);
        }
    }
    
    /**
     * Load settings from localStorage
     * @returns {Object} Settings object
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('commandwave_settings');
            return savedSettings ? JSON.parse(savedSettings) : {
                // Default settings
                theme: 'dark',
                username: 'User_' + Math.floor(Math.random() * 1000),
                notifications: true,
                autoSave: true
            };
        } catch (error) {
            console.error('Error loading settings:', error);
            return {
                theme: 'dark',
                username: 'User',
                notifications: true,
                autoSave: true
            };
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('commandwave_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @returns {any} Setting value, or null if not found
     */
    getSetting(key) {
        return this.settings[key] !== undefined ? this.settings[key] : null;
    }
    
    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
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
