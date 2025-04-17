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

    // Note Size Selector Logic
    const noteSizeSelector = document.querySelector('.note-size-selector');
    if (noteSizeSelector) {
        // Get currently saved note size or use default
        const currentSize = localStorage.getItem('commandwave-note-size') || 'medium';
        
        // Mark initially selected size
        const sizeOptions = noteSizeSelector.querySelectorAll('.note-size-option');
        sizeOptions.forEach(option => {
            if (option.dataset.size === currentSize) {
                option.classList.add('selected');
            }
            
            // Add click handlers
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const newSize = this.dataset.size;
                
                // Update selected state
                sizeOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                // Save preference
                localStorage.setItem('commandwave-note-size', newSize);
                
                // Apply size to all note panels
                document.documentElement.setAttribute('data-note-size', newSize);
                
                // Dispatch event for NotesManager to handle
                document.dispatchEvent(new CustomEvent('note-size-changed', { 
                    detail: { size: newSize } 
                }));
            });
        });
        
        // Initial application of size
        document.documentElement.setAttribute('data-note-size', currentSize);
    }
});
