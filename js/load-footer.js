/**
 * Footer Loader Script
 * Dynamically loads the unified footer component
 */
(function() {
    'use strict';

    // Function to load footer
    function loadFooter() {
        const footerPlaceholder = document.getElementById('footer-placeholder');

        if (!footerPlaceholder) {
            console.warn('Footer placeholder not found');
            return;
        }

        fetch(`components/footer.html?v=${Date.now()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Footer template not found');
                }
                return response.text();
            })
            .then(html => {
                footerPlaceholder.innerHTML = html;
                console.log('Footer loaded successfully');
            })
            .catch(error => {
                console.error('Error loading footer:', error);
            });
    }

    // Load footer when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFooter);
    } else {
        loadFooter();
    }
})();
