/**
 * EduTaktis Lightweight Production JavaScript
 * Pure Vanilla JS — Zero framework dependencies
 */

document.addEventListener('DOMContentLoaded', function() {
    // Accessibility: Ensure focus states are clear for keyboard users
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });

    // Copy Prompt Buttons (Progressive Enhancement)
    const copyButtons = document.querySelectorAll('.copy-prompt-btn');
    copyButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                navigator.clipboard.writeText(targetEl.textContent).then(function() {
                    const originalText = btn.textContent;
                    btn.textContent = 'Prompt Disalin!';
                    setTimeout(function() {
                        btn.textContent = originalText;
                    }, 2000);
                });
            }
        });
    });
});
