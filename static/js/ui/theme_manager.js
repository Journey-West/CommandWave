/**
 * theme_manager.js - Modular theme management for CommandWave
 * Handles theme switching, persistence, and UI updates
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'commandwave-theme';
        this.defaultTheme = 'dark';
        this.availableThemes = ['dark', 'light', 'witchhazel', 'digital-rain', 'outrun-sunset', 'corporate-dystopia', 'holographic', 'tokyo-night', 'amber-interface'];
        this.themeFileMap = {
            'dark': 'cyberpunk-dark',
            'light': 'neon-light',
            'witchhazel': 'witch-hazel',
            'digital-rain': 'digital-rain',
            'outrun-sunset': 'outrun-sunset',
            'corporate-dystopia': 'corporate-dystopia',
            'holographic': 'holographic',
            'tokyo-night': 'tokyo-night',
            'amber-interface': 'amber-interface'
        };
        this.themeLabels = {
            'dark': 'Cyberpunk Dark',
            'light': 'Neon Light',
            'witchhazel': 'Witch Hazel',
            'digital-rain': 'Digital Rain',
            'outrun-sunset': 'Outrun Sunset',
            'corporate-dystopia': 'Corporate Dystopia',
            'holographic': 'Holographic',
            'tokyo-night': 'Tokyo Night',
            'amber-interface': 'Amber Interface'
        };
        this.themeIcons = {
            'dark': 'fa-moon',
            'light': 'fa-sun',
            'witchhazel': 'fa-spa',
            'digital-rain': 'fa-code',
            'outrun-sunset': 'fa-sun',
            'corporate-dystopia': 'fa-building',
            'holographic': 'fa-glass-cheers',
            'tokyo-night': 'fa-city',
            'amber-interface': 'fa-tv'
        };
        
        this.init();
    }
    
    /**
     * Initialize theme system
     */
    init() {
        // Get saved theme or use default
        const currentTheme = this.getSavedTheme();
        this.applyTheme(currentTheme);
        
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
}

// Export for use in other modules
export default ThemeManager;
