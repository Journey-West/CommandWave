// main.js - Main JavaScript for CommandWave Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme system
    initThemeSystem();
    
    // Terminal cursor blinking effect
    setInterval(() => {
        const cursors = document.querySelectorAll('.blink');
        cursors.forEach(cursor => {
            cursor.style.visibility = cursor.style.visibility === 'hidden' ? 'visible' : 'hidden';
        });
    }, 500);
    
    // Handle theme option clicks
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            applyTheme(theme);
            
            // Update active state on theme selector
            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Theme toggle button for mobile/header
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            cycleTheme();
        });
    }
});

function initThemeSystem() {
    // Get saved theme or use default (dark)
    const savedTheme = localStorage.getItem('commandwave-docs-theme') || 'dark';
    applyTheme(savedTheme);
    
    // Set active class on the correct theme option
    const activeOption = document.querySelector(`.theme-option[data-theme="${savedTheme}"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
    
    // Update theme toggle icon
    updateThemeIcon(savedTheme);
}

function applyTheme(theme) {
    // Remove existing theme attribute
    document.documentElement.removeAttribute('data-theme');
    
    // Apply new theme (dark is default)
    if (theme && theme !== 'dark') {
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    // Save preference
    localStorage.setItem('commandwave-docs-theme', theme);
    
    // Update toggle icon
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-toggle i');
    if (!themeIcon) return;
    
    // Reset classes
    themeIcon.className = '';
    
    // Set appropriate icon
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
    } else if (theme === 'light') {
        themeIcon.className = 'fas fa-moon';
    } else if (theme === 'witchhazel') {
        themeIcon.className = 'fas fa-hat-wizard';
    }
}

function cycleTheme() {
    const currentTheme = localStorage.getItem('commandwave-docs-theme') || 'dark';
    
    let newTheme;
    if (currentTheme === 'dark') {
        newTheme = 'light';
    } else if (currentTheme === 'light') {
        newTheme = 'witchhazel';
    } else {
        newTheme = 'dark';
    }
    
    applyTheme(newTheme);
    
    // Update active state on theme selector
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    const activeOption = document.querySelector(`.theme-option[data-theme="${newTheme}"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
}
