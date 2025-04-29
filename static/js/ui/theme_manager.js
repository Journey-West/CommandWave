/**
 * theme_manager.js - Modular theme management for CommandWave
 * Handles theme switching, persistence, and UI updates
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'commandwave-theme';
        this.defaultTheme = 'dark';
        this.availableThemes = [];
        this.themeFileMap = {};
        this.themeLabels = {};
        this.themeIcons = {};
        
        // Load theme metadata, then discover CSS files, then initialize
        this.fetchThemeMetadata()
            .then(() => this.fetchAvailableThemes())
            .then(() => this.init());
    }
    
    /**
     * Initialize theme system
     */
    init() {
        // Get saved theme or use default
        const currentTheme = this.getSavedTheme();
        this.applyTheme(currentTheme);
        
        // Dynamically render theme options
        this.renderThemeOptions();
        
        // Set up theme option click handlers
        this.setupThemeOptionHandlers();
        
        // Set up theme toggle in header
        this.setupThemeToggle();
        
        console.log(`Theme system initialized with theme: ${currentTheme}`);
    }
    
    /**
     * Get the currently saved theme from localStorage
     * @returns {string} The current theme
     */
    getSavedTheme() {
        const savedTheme = localStorage.getItem(this.storageKey);
        return this.availableThemes.includes(savedTheme) ? savedTheme : this.defaultTheme;
    }
    
    /**
     * Apply a theme to the document
     * @param {string} theme - Theme name to apply
     */
    applyTheme(theme) {
        if (!this.availableThemes.includes(theme)) {
            console.error(`Theme '${theme}' is not available`);
            theme = this.defaultTheme;
        }
        
        // Dynamic theme CSS loader
        const existingLink = document.getElementById('theme-css');
        if (existingLink) existingLink.remove();
        const fileName = this.themeFileMap[theme];
        if (fileName) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.id = 'theme-css';
            link.href = `/static/css/themes/${fileName}.css`;
            document.head.appendChild(link);
        }
        
        // Remove existing theme attribute
        document.documentElement.removeAttribute('data-theme');
        
        // Set theme attribute for non-default (none here, only dark)
        if (theme !== 'dark') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // Update active state in theme modal
        this.updateActiveThemeOption(theme);
        
        // Update theme icon
        this.updateThemeIcon(theme);
        
        // Save preference
        localStorage.setItem(this.storageKey, theme);
        
        // Dispatch theme change event
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme } 
        }));
        
        console.log(`Applied theme: ${theme}`);
    }
    
    /**
     * Update which theme option shows as active in the theme modal
     * @param {string} theme - Active theme name
     */
    updateActiveThemeOption(theme) {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    /**
     * Update the theme icon in the header
     * @param {string} theme - Current theme name
     */
    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-toggle i');
        if (!themeIcon) return;
        
        // Reset classes
        themeIcon.className = '';
        
        // Add fas and the theme-specific icon
        themeIcon.classList.add('fas');
        themeIcon.classList.add(this.themeIcons[theme] || 'fa-moon');
    }
    
    /**
     * Set up click handlers for theme options
     */
    setupThemeOptionHandlers() {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                this.applyTheme(theme);
                
                // Close modal if it's open
                const themeModal = document.getElementById('themeModal');
                if (themeModal && themeModal.classList.contains('active')) {
                    themeModal.classList.remove('active');
                }
            });
        });
    }
    
    /**
     * Render theme options dynamically based on availableThemes
     */
    renderThemeOptions() {
        const container = document.querySelector('.theme-options');
        if (!container) return;
        container.innerHTML = '';
        this.availableThemes.forEach(theme => {
            const option = document.createElement('div');
            option.classList.add('theme-option');
            option.setAttribute('data-theme', theme);
            // Preview box
            const preview = document.createElement('div');
            preview.classList.add('theme-preview', theme);
            option.appendChild(preview);
            // Theme label
            const name = document.createElement('div');
            name.classList.add('theme-name');
            name.textContent = this.themeLabels[theme] || theme;
            option.appendChild(name);
            container.appendChild(option);
        });
    }
    
    /**
     * Set up the theme toggle button in the header
     */
    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.cycleTheme();
            });
        }
        
        // Also set up the theme menu item
        const themeMenuItem = document.getElementById('themeMenuItem');
        if (themeMenuItem) {
            themeMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                const themeModal = document.getElementById('themeModal');
                if (themeModal) {
                    themeModal.classList.add('active');
                }
            });
        }
        
        // Close modals when clicking close button or outside
        document.querySelectorAll('.modal-close, .modal-btn').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.modal-container').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-container').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    }
    
    /**
     * Cycle to the next theme in the list
     */
    cycleTheme() {
        const currentTheme = this.getSavedTheme();
        const currentIndex = this.availableThemes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % this.availableThemes.length;
        const nextTheme = this.availableThemes[nextIndex];
        
        this.applyTheme(nextTheme);
    }
    
    /**
     * Get the icon for a specific theme
     * @param {string} theme - Theme name
     * @returns {string} Font Awesome icon class
     */
    getThemeIcon(theme) {
        return this.themeIcons[theme] || 'fa-moon';
    }
    
    /**
     * Get readable name for a theme
     * @param {string} theme - Theme name
     * @returns {string} Human-readable theme name
     */
    getThemeLabel(theme) {
        return this.themeLabels[theme] || 'Unknown Theme';
    }
    
    /**
     * Fetch available theme CSS files and filter mapping
     */
    async fetchAvailableThemes() {
        try {
            const res = await fetch('/api/themes');
            const data = await res.json();
            const files = data.themes;
            this.availableThemes = Object.keys(this.themeFileMap)
                .filter(key => files.includes(this.themeFileMap[key]));
        } catch (e) {
            console.error('Error fetching themes:', e);
            this.availableThemes = Object.keys(this.themeFileMap);
        }
    }
    
    /**
     * Fetch theme metadata (file map, labels, icons) from static JSON manifest
     */
    async fetchThemeMetadata() {
        try {
            const res = await fetch('/static/css/themes/themes.json');
            const data = await res.json();
            Object.keys(data).forEach(key => {
                const item = data[key];
                this.themeFileMap[key] = item.file;
                this.themeLabels[key] = item.label;
                this.themeIcons[key] = item.icon;
            });
        } catch (e) {
            console.error('Error loading theme metadata:', e);
        }
    }
}

// Export for use in other modules
export default ThemeManager;
