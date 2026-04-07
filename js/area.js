// Area page interactive functionality
document.addEventListener('DOMContentLoaded', function() {
    // Seasonal tabs functionality
    const seasonTabs = document.querySelectorAll('.season-tab');
    const seasonContents = document.querySelectorAll('.season-content');

    seasonTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetSeason = this.getAttribute('data-season');

            // Remove active class from all tabs and contents
            seasonTabs.forEach(t => t.classList.remove('active'));
            seasonContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Show corresponding content
            const targetContent = document.getElementById(targetSeason);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Add smooth animations to attraction items
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe attraction items
    const attractionItems = document.querySelectorAll('.attraction-item, .spot-item, .tour-card');
    attractionItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });
});