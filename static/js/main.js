// main.js
// Entry point for CommandWave frontend logic. Imports UI modules, API modules, and utilities.

// Import UI modules
import ThemeManager from './ui/theme_manager.js';

// Initialize modules when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('CommandWave initializing...');
    
    // Initialize the theme manager
    const themeManager = new ThemeManager();
    window.themeManager = themeManager; // Make available globally for legacy code
    
    // Add temporary placeholder for old inline script functionality
    // This will be gradually migrated to the appropriate modules
    initializeTemporaryHandlers();
    
    console.log('CommandWave initialized.');
});

/**
 * Temporary function to handle legacy inline script functionality
 * This will be gradually migrated to the proper modules
 */
function initializeTemporaryHandlers() {
    // Terminal tabs functionality
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const port = this.getAttribute('data-port');
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.terminal-frame').forEach(frame => frame.style.display = 'none');
            
            this.classList.add('active');
            const frame = document.getElementById(`terminal-${port}`);
            if (frame) {
                frame.style.display = 'block';
            }
        });
    });
    
    // New terminal button
    const newTerminalBtn = document.getElementById('newTerminalBtn');
    if (newTerminalBtn) {
        newTerminalBtn.addEventListener('click', function() {
            fetch('/api/terminals/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload(); // This will be improved to avoid full page reload
                } else {
                    showError(data.error || 'Failed to create new terminal');
                }
            })
            .catch(error => {
                showError('Network error: ' + error.message);
            });
        });
    }
    
    // Theme modal open/close
    // Removed the duplicate handler here - ThemeManager now handles this
    
    // About modal
    const aboutMenuItem = document.getElementById('aboutMenuItem');
    if (aboutMenuItem) {
        aboutMenuItem.addEventListener('click', function(e) {
            e.preventDefault();
            const aboutModal = document.getElementById('aboutModal');
            if (aboutModal) {
                aboutModal.classList.add('active');
            }
        });
    }
    
    // Close modals when clicking close button or outside
    document.querySelectorAll('.modal-close, .modal-footer .modal-btn').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.modal-container').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });
    
    // Toggle variables section
    const toggleVariablesBtn = document.getElementById('toggleVariablesBtn');
    const variableContent = document.getElementById('variableContent');
    const variablesCollapseIcon = document.getElementById('variablesCollapseIcon');
    
    if (toggleVariablesBtn && variableContent && variablesCollapseIcon) {
        toggleVariablesBtn.addEventListener('click', function() {
            variableContent.classList.toggle('collapsed');
            if (variableContent.classList.contains('collapsed')) {
                variablesCollapseIcon.classList.remove('fa-angle-down');
                variablesCollapseIcon.classList.add('fa-angle-right');
            } else {
                variablesCollapseIcon.classList.remove('fa-angle-right');
                variablesCollapseIcon.classList.add('fa-angle-down');
            }
        });
    }
    
    // Add variable input
    const addVariableBtn = document.getElementById('addVariableInput');
    if (addVariableBtn) {
        addVariableBtn.addEventListener('click', function() {
            const createVariableModal = document.getElementById('createVariableModal');
            if (createVariableModal) {
                createVariableModal.classList.add('active');
                document.getElementById('newVariableName').focus();
            }
        });
    }
    
    // Settings dropdown toggle
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDropdown = document.getElementById('settingsDropdown');
    if (settingsBtn && settingsDropdown) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling to document
            settingsDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (!settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
                settingsDropdown.classList.remove('show');
            }
        });
    }
    
    // Simple error display function
    window.showError = function(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.classList.add('active');
        } else {
            alert(message);
        }
    };
}
