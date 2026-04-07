// Plan Detail New Page JavaScript

// Plan data
const PLAN_DATA = {
    standard: {
        breadcrumb: 'ツインルーム【セミダブルベッド】',
        title: 'ツインルーム【セミダブルベッド】',
        subtitle: 'Twin Room with Semi-Double Beds',
        bedInfo: 'セミダブル × 2',
        capacity: '最大2名',
        area: '33㎡',
        bedType: 'セミダブルベッド × 2台',
        view: '山景色',
        price: '19,800',
        images: [
            'img/rooms/double room/room_2_500.jpg',
            'img/rooms/double room/room_2_500 - Copy.jpg'
        ]
    },
    deluxe: {
        breadcrumb: 'トリプルルーム【シングルベッド】',
        title: 'トリプルルーム【シングルベッド】',
        subtitle: 'Triple Room with Single Beds',
        bedInfo: 'シングル × 3',
        capacity: '最大3名',
        area: '33㎡',
        bedType: 'シングルベッド × 3台',
        view: '山景色',
        price: '22,000',
        images: [
            'img/rooms/triple room/room_3_500.jpg',
            'img/rooms/triple room/room_3_500 - Copy.jpg'
        ]
    },
    suite: {
        breadcrumb: '和洋室 6帖和室＋洋室ツイン',
        title: '和洋室 6帖和室＋洋室ツイン【シングルベッド】',
        subtitle: 'Japanese-Western Room',
        bedInfo: '和室 + シングル × 2',
        capacity: '最大4名',
        area: '33㎡',
        bedType: '6帖和室＋シングルベッド × 2台',
        view: '山景色',
        price: '24,200',
        images: [
            'img/rooms/Western japanese room/room_wayou500.jpg',
            'img/rooms/Western japanese room/room_wayou500 - Copy.jpg'
        ]
    },
    onsen: {
        breadcrumb: 'ファミリー和洋室 15帖和洋室＋洋室ツイン',
        title: 'ファミリー和洋室 15帖和洋室＋洋室ツイン【セミダブルベッド】',
        subtitle: 'Family Japanese-Western Room',
        bedInfo: '和洋室 + セミダブル × 2',
        capacity: '最大6名',
        area: '特大サイズ',
        bedType: '15帖和洋室＋セミダブルベッド × 2台',
        view: '山景色',
        price: '16,500',
        images: [
            'img/rooms/family japanese room/room_family_500.jpg',
            'img/rooms/family japanese room/room_family_500 - Copy.jpg'
        ]
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Get plan type from URL
    const urlParams = new URLSearchParams(window.location.search);
    const planType = urlParams.get('plan') || 'standard';
    const planData = PLAN_DATA[planType] || PLAN_DATA.standard;

    // Update page content
    updatePageContent(planData);

    // Initialize gallery
    initializeGallery(planData.images);

    // Initialize tabs
    initializeTabs();

    // Initialize bottom CTA bar
    initializeBottomCTA();

    // Initialize scroll animations
    initializeScrollAnimations();
});

function updatePageContent(planData) {
    // Breadcrumb
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = planData.breadcrumb;

    // Hero Title
    const heroTitle = document.getElementById('heroPlanTitle');
    if (heroTitle) heroTitle.textContent = planData.title;

    const heroSubtitle = document.getElementById('heroPlanSubtitle');
    if (heroSubtitle) heroSubtitle.textContent = planData.subtitle;

    // Quick Info
    const quickBedInfo = document.getElementById('quickBedInfo');
    if (quickBedInfo) quickBedInfo.textContent = planData.bedInfo;

    const quickCapacity = document.getElementById('quickCapacity');
    if (quickCapacity) quickCapacity.textContent = planData.capacity;

    const quickArea = document.getElementById('quickArea');
    if (quickArea) quickArea.textContent = planData.area;

    // Specs
    const specArea = document.getElementById('specArea');
    if (specArea) specArea.textContent = planData.area;

    const specBed = document.getElementById('specBed');
    if (specBed) specBed.textContent = planData.bedType;

    const specCapacity = document.getElementById('specCapacity');
    if (specCapacity) specCapacity.textContent = planData.capacity;

    const specView = document.getElementById('specView');
    if (specView) specView.textContent = planData.view;

    const specPrice = document.getElementById('specPrice');
    if (specPrice) specPrice.textContent = planData.price;

    // CTA Bar
    const ctaRoomName = document.getElementById('ctaRoomName');
    if (ctaRoomName) ctaRoomName.textContent = planData.title;

    const ctaPrice = document.getElementById('ctaPrice');
    if (ctaPrice) ctaPrice.textContent = planData.price;
}

function initializeGallery(images) {
    const heroMainImage = document.getElementById('heroMainImage');
    const thumbnailsScroll = document.getElementById('thumbnailsScroll');

    if (!heroMainImage || !thumbnailsScroll) return;

    // Clear existing thumbnails
    thumbnailsScroll.innerHTML = '';

    // Create thumbnails
    images.forEach((imageSrc, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail-item ${index === 0 ? 'active' : ''}`;
        thumbnail.dataset.image = imageSrc;

        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = `View ${index + 1}`;

        thumbnail.appendChild(img);
        thumbnailsScroll.appendChild(thumbnail);

        // Add click event
        thumbnail.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
            thumbnail.classList.add('active');

            // Update hero image
            heroMainImage.src = imageSrc;
            heroMainImage.style.transform = 'scale(1.05)';
            setTimeout(() => {
                heroMainImage.style.transform = 'scale(1)';
            }, 300);
        });
    });
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.amenity-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function initializeBottomCTA() {
    const ctaBar = document.querySelector('.bottom-cta-bar');
    const heroSection = document.querySelector('.plan-hero-section');

    if (!ctaBar || !heroSection) return;

    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', function() {
        const heroHeight = heroSection.offsetHeight;
        const scrollY = window.scrollY;

        // Show CTA bar when scrolled past hero section
        if (scrollY > heroHeight) {
            ctaBar.classList.add('visible');
        } else {
            ctaBar.classList.remove('visible');
        }

        lastScrollY = scrollY;
    });
}

function initializeScrollAnimations() {
    const cards = document.querySelectorAll('.content-card');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';

                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
}
