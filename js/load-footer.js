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
            .then(async html => {
                footerPlaceholder.innerHTML = html;
                // 填充联系信息（需要先确保配置已加载）
                if (typeof loadConfig === 'function') {
                    await loadConfig();
                }
                if (typeof fillContactInfo === 'function') {
                    fillContactInfo();
                }
                // 应用翻译
                if (typeof updatePageLanguage === 'function') {
                    updatePageLanguage();
                }
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
