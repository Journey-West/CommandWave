// settings_modal.js
// Handles opening, closing, and saving settings in the modal

document.addEventListener('DOMContentLoaded', function () {
    const openBtn = document.getElementById('settingsBtn');
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    const cancelBtn = document.getElementById('cancelSettingsBtn');
    const saveBtn = document.getElementById('saveSettingsBtn');

    // Open modal
    if (openBtn && modal) {
        openBtn.addEventListener('click', function () {
            modal.classList.add('show');
        });
    }
    // Close modal
    [closeBtn, cancelBtn].forEach(btn => {
        if (btn && modal) {
            btn.addEventListener('click', function () {
                modal.classList.remove('show');
            });
        }
    });
    // Save settings (placeholder)
    if (saveBtn && modal) {
        saveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            // TODO: Add save logic here
            modal.classList.remove('show');
        });
    }
    // Close modal on outside click
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Theme Picker Logic
    const themePicker = document.getElementById('themePicker');
    if (themePicker) {
        // Set initial selection based on current theme
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const options = themePicker.querySelectorAll('.theme-card');
        
        // Mark initially selected theme
        options.forEach(card => {
            if (card.dataset.theme === currentTheme) {
                card.classList.add('selected');
            }
            
            // Add click handlers
            card.addEventListener('click', function (e) {
                e.preventDefault();
                options.forEach(opt => opt.classList.remove('selected'));
                card.classList.add('selected');
                // Preview theme instantly:
                document.body.setAttribute('data-theme', card.dataset.theme);
            });
        });
    }
});
