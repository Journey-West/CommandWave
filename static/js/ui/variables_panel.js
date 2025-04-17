// ui/variables_panel.js
// UI logic for the variables panel component.

export default class VariablesPanel {
    init() {
        const section = document.querySelector('.variable-section');
        const toggleBtn = document.getElementById('toggleVariablesBtn');
        const icon = document.getElementById('variablesCollapseIcon');

        if (toggleBtn && section && icon) {
            toggleBtn.addEventListener('click', function () {
                section.classList.toggle('collapsed');
                // icon rotation now handled by CSS
            });
        }
    }
}
