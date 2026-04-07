// Main JavaScript for Hotel Website
document.addEventListener('DOMContentLoaded', function() {

    // Header scroll effect
    const header = document.querySelector('.header-top-container');

    function handleScroll() {
        // All pages use the same scroll-based logic
        if (header) {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    }

    if (header) {
        window.addEventListener('scroll', handleScroll);
    }

    // Search form handling
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const checkin = document.getElementById('checkin').value;
            const checkout = document.getElementById('checkout').value;
            const adults = document.getElementById('adults').value;
            const children = document.getElementById('children').value;

            if (!checkin || !checkout) {
                alert('チェックイン・チェックアウト日を選択してください。');
                return;
            }

            if (new Date(checkin) >= new Date(checkout)) {
                alert('チェックアウト日はチェックイン日より後の日付を選択してください。');
                return;
            }

            // Redirect to rooms page with search parameters
            const params = new URLSearchParams({
                checkin: checkin,
                checkout: checkout,
                adults: adults,
                children: children
            });

            window.location.href = `reservation.html?${params.toString()}`;
        });
    }

    // Set default dates (today and tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');

    if (checkinInput && checkoutInput) {
        checkinInput.value = today.toISOString().split('T')[0];
        checkoutInput.value = tomorrow.toISOString().split('T')[0];

        // Set minimum date to today
        checkinInput.min = today.toISOString().split('T')[0];
        checkoutInput.min = tomorrow.toISOString().split('T')[0];

        // Update checkout min date when checkin changes
        checkinInput.addEventListener('change', function() {
            const checkinDate = new Date(this.value);
            const nextDay = new Date(checkinDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutInput.min = nextDay.toISOString().split('T')[0];

            if (new Date(checkoutInput.value) <= checkinDate) {
                checkoutInput.value = nextDay.toISOString().split('T')[0];
            }
        });
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe alternating items
    const alternatingItems = document.querySelectorAll('.alternating-item');
    alternatingItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const headerTopMenu = document.querySelector('.header-top-menu');

    if (mobileMenuToggle && headerTopMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            headerTopMenu.classList.toggle('mobile-active');
            this.classList.toggle('active');

            // Prevent body scroll when menu is open
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking on a link
        const menuLinks = headerTopMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                headerTopMenu.classList.remove('mobile-active');
                mobileMenuToggle.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });
    }
});

// Utility functions
function formatDate(date) {
    return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(date));
}

function calculateNights(checkin, checkout) {
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Form validation utilities
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\-\+\(\)\s]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// API simulation functions (for demonstration)
const HotelAPI = {
    // Simulate room availability check
    checkAvailability: async function(checkin, checkout, adults, children) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock room data
        return [
            {
                id: 1,
                name: '海景標準間',
                price: 15000,
                available: 3,
                maxGuests: 2,
                amenities: ['無料WiFi', '空調', '24時間熱水', '海景窗'],
                image: 'img/rooms/standard.jpg'
            },
            {
                id: 2,
                name: '海景豪華間',
                price: 25000,
                available: 2,
                maxGuests: 3,
                amenities: ['無料WiFi', '空調', '24時間熱水', '海景陽台', '浴缸'],
                image: 'img/rooms/deluxe.jpg'
            },
            {
                id: 3,
                name: '総統套房',
                price: 45000,
                available: 1,
                maxGuests: 4,
                amenities: ['無料WiFi', '空調', '24時間熱水', '全海景', '按摩浴缸'],
                image: 'img/rooms/suite.jpg'
            }
        ];
    },

    // Simulate booking creation
    createBooking: async function(bookingData) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            bookingId: 'YMD' + Date.now(),
            status: 'confirmed',
            totalAmount: bookingData.totalAmount,
            confirmationNumber: 'CONF-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        };
    }
};

// Yuzawamd Exact Copy - Gallery functionality
document.addEventListener('DOMContentLoaded', function() {
    // Room gallery functionality - Yuzawamd style
    const roomImages = document.querySelectorAll('.room-image');
    let currentRoomIndex = 0;

    function showRoomImage(index) {
        roomImages.forEach(img => img.classList.remove('active'));
        if (roomImages[index]) {
            roomImages[index].classList.add('active');
        }
        currentRoomIndex = index;
    }

    // Auto-rotate room gallery every 4 seconds - like Yuzawamd
    if (roomImages.length > 1) {
        setInterval(() => {
            const nextIndex = (currentRoomIndex + 1) % roomImages.length;
            showRoomImage(nextIndex);
        }, 4000);
    }

    // Feature sections scroll animation - Immediate trigger
    const featureObserverOptions = {
        threshold: 0.05,  // Trigger when 5% visible
        rootMargin: '50px 0px -50px 0px'  // Trigger 50px before entering viewport
    };

    const featureObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('in-view')) {
                // Add animation when entering viewport
                setTimeout(() => {
                    entry.target.classList.add('in-view');
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0) scale(1)';
                }, 100);
            }
        });
    }, featureObserverOptions);

    // Observe feature sections
    const featureSections = document.querySelectorAll('.feature-section');
    featureSections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(60px)';
        section.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        featureObserver.observe(section);
    });

    // Restaurant images hover effects - Yuzawamd style
    const restaurantImages = document.querySelectorAll('.restaurant-image');
    restaurantImages.forEach(img => {
        img.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'transform 0.6s ease';
        });

        img.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Onsen bath hover effects - Yuzawamd style
    const onsenBaths = document.querySelectorAll('.onsen-bath');
    onsenBaths.forEach(bath => {
        const label = bath.querySelector('.bath-label');
        const img = bath.querySelector('img');

        bath.addEventListener('mouseenter', function() {
            if (img) {
                img.style.transform = 'scale(1.05)';
                img.style.transition = 'transform 0.8s ease';
            }
            if (label) {
                label.style.background = 'rgba(255, 255, 255, 1)';
                label.style.transform = 'scale(1.05)';
                label.style.transition = 'all 0.3s ease';
            }
        });

        bath.addEventListener('mouseleave', function() {
            if (img) {
                img.style.transform = 'scale(1)';
            }
            if (label) {
                label.style.background = 'rgba(255, 255, 255, 0.9)';
                label.style.transform = 'scale(1)';
            }
        });
    });

    // Concept image hover effect - Yuzawamd style
    const conceptImage = document.querySelector('.concept-section .feature-image img');
    if (conceptImage) {
        conceptImage.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'transform 0.8s ease';
            this.style.filter = 'brightness(1.1)';
        });

        conceptImage.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.filter = 'brightness(1)';
        });
    }

    // Add highlight effect when section is in center of viewport
    window.addEventListener('scroll', function() {
        const featureSections = document.querySelectorAll('.feature-section');
        const windowHeight = window.innerHeight;
        const windowCenter = windowHeight / 2;

        featureSections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.top + (rect.height / 2);

            // Check if section center is near viewport center
            const distanceFromCenter = Math.abs(sectionCenter - windowCenter);

            if (distanceFromCenter < 200 && section.classList.contains('in-view')) {
                // Section is centered - add highlight
                section.style.transform = 'translateY(0) scale(1.02)';
                section.style.boxShadow = '0 20px 60px rgba(0,0,0,0.1)';
            } else if (section.classList.contains('in-view')) {
                // Section is visible but not centered
                section.style.transform = 'translateY(0) scale(1)';
                section.style.boxShadow = 'none';
            }
        });
    });
});

// Export for other pages to use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HotelAPI, formatDate, calculateNights, validateEmail, validatePhone };
}