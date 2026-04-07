// Plan Detail Page JavaScript

// Consolidated plan data structure - defined at top level for proper initialization
const PLAN_DATA = {
    standard: {
        breadcrumb: 'ツインルーム【セミダブルベッド】',
        title: 'ツインルーム【セミダブルベッド】スタンダードプラン',
        subtitle: 'Twin Room with Semi-Double Beds Plan',
        roomSize: '33㎡',
        bedType: 'セミダブルベッド × 2台',
        capacity: '最大2名様',
        view: '山景色ビュー',
        description: '快適なセミダブルベッドを2台配置したツインルームです。33m²の広々とした空間で、ビジネスやカップルでのご利用に最適です。',
        priceWithTax: 19800, // 税後価格（含10%消費税）
        // Additional properties for compatibility
        maxGuests: '最大2名様',
        meals: '食事なし',
        area: '33㎡',
        bedSize: 'セミダブル × 2台'
    },
    deluxe: {
        breadcrumb: 'トリプルルーム【シングルベッド】',
        title: 'トリプルルーム【シングルベッド】プラン',
        subtitle: 'Triple Room with Single Beds Plan',
        roomSize: '33㎡',
        bedType: 'シングルベッド × 3台',
        capacity: '最大3名様',
        view: '山景色ビュー',
        description: '3名様でのご利用に最適なトリプルルームです。シングルベッドを3台配置し、33m²の充分な広さでゆったりとお過ごしいただけます。',
        priceWithTax: 22000, // 税後価格（含10%消費税）
        maxGuests: '最大3名様',
        meals: '食事なし',
        area: '33㎡',
        bedSize: 'シングル × 3台'
    },
    suite: {
        breadcrumb: '和洋室 6帖和室＋洋室ツイン',
        title: '和洋室 6帖和室＋洋室ツイン【シングルベッド】プラン',
        subtitle: 'Japanese-Western Room Plan',
        roomSize: '33㎡',
        bedType: '6帖和室＋シングルベッド × 2台',
        capacity: '最大4名様',
        view: '山景色ビュー',
        description: '和の落ち着きと洋の機能性を併せ持つ和洋室です。6帖の和室とシングルベッド2台の洋室を組み合わせ、多様なご利用シーンに対応いたします。',
        priceWithTax: 24200, // 税後価格（含10%消費税）
        maxGuests: '最大4名様',
        meals: '食事なし',
        area: '33㎡',
        bedSize: '和室 + シングル × 2台'
    },
    onsen: {
        breadcrumb: 'ファミリー和洋室 15帖和洋室＋洋室ツイン',
        title: 'ファミリー和洋室 15帖和洋室＋洋室ツイン【セミダブルベッド】プラン',
        subtitle: 'Family Japanese-Western Room Plan',
        roomSize: '特大サイズ',
        bedType: '15帖和洋室＋セミダブルベッド × 2台',
        capacity: '最大6名様',
        view: '山景色ビュー',
        description: 'ご家族での滞在に最適な広々としたファミリー和洋室です。15帖の和洋室とセミダブルベッド2台の洋室を組み合わせ、大型テレビ（32インチ）を完備した特別なお部屋です。',
        priceWithTax: 16500, // 税後価格（含10%消費税）
        maxGuests: '最大6名様',
        meals: '食事なし',
        area: '特大サイズ',
        bedSize: '和洋室 + セミダブル × 2台'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements to avoid repeated queries
    const elements = {
        carouselTrack: document.getElementById('carouselTrack'),
        carouselPrev: document.getElementById('carouselPrev'),
        carouselNext: document.getElementById('carouselNext'),
        roomPriceElement: document.getElementById('roomPrice'),
        backBtn: document.querySelector('.back-btn')
    };

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const planType = urlParams.get('plan') || 'standard';

    // Update page content based on plan type
    updatePageContent(planType);

    // Image Carousel functionality
    let currentSlide = 0;
    let totalSlides = 2; // Default to 2 slides
    let carouselInitialized = false;

    // Update carousel for the current plan type
    updateCarouselForPlan(planType);

    // Update slide count based on plan type
    function updateCarouselForPlan(planType) {
        const carouselData = getCarouselData(planType);
        totalSlides = carouselData.images.length;

        // Use document fragment for better performance
        updateCarouselHTML(carouselData);

        // Reset to first slide
        currentSlide = 0;
        updateCarousel();

        // Initialize carousel events only once
        if (!carouselInitialized) {
            initializeCarouselEvents();
            carouselInitialized = true;
        }
    }

    // Optimized carousel HTML update using document fragments
    function updateCarouselHTML(carouselData) {
        // Update carousel track
        if (elements.carouselTrack) {
            const fragment = document.createDocumentFragment();

            carouselData.images.forEach(img => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                slide.style.width = `${100 / totalSlides}%`;

                const image = document.createElement('img');
                image.src = img.src;
                image.alt = img.alt;
                image.className = 'carousel-image';

                slide.appendChild(image);
                fragment.appendChild(slide);
            });

            elements.carouselTrack.innerHTML = '';
            elements.carouselTrack.appendChild(fragment);
            elements.carouselTrack.style.width = `${totalSlides * 100}%`;
        }

        // Update indicators efficiently
        updateIndicators(carouselData.images.length);

        // Update thumbnails efficiently
        updateThumbnails(carouselData.images);
    }

    function updateIndicators(count) {
        const indicatorsContainer = document.getElementById('carouselIndicators');
        if (!indicatorsContainer) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const indicator = document.createElement('span');
            indicator.className = `indicator ${i === 0 ? 'active' : ''}`;
            indicator.setAttribute('data-slide', i);
            fragment.appendChild(indicator);
        }

        indicatorsContainer.innerHTML = '';
        indicatorsContainer.appendChild(fragment);
    }

    function updateThumbnails(images) {
        const thumbnailsContainer = document.querySelector('.gallery-thumbnails');
        if (!thumbnailsContainer) return;

        const fragment = document.createDocumentFragment();
        images.forEach((img, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = img.src;
            thumbnail.alt = img.alt;
            thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumbnail.setAttribute('data-slide', index);
            fragment.appendChild(thumbnail);
        });

        thumbnailsContainer.innerHTML = '';
        thumbnailsContainer.appendChild(fragment);
    }

    function getCarouselData(planType) {
        const carouselData = {
            standard: {
                images: [
                    { src: 'img/rooms/double room/room_2_500.jpg', alt: 'ツインルーム【セミダブルベッド】- 客室全体' },
                    { src: 'img/rooms/double room/room_2_500 - Copy.jpg', alt: 'ツインルーム【セミダブルベッド】- ベッドエリア' }
                ]
            },
            deluxe: {
                images: [
                    { src: 'img/rooms/triple room/room_3_500.jpg', alt: 'トリプルルーム【シングルベッド】- 客室全体' },
                    { src: 'img/rooms/triple room/room_3_500 - Copy.jpg', alt: 'トリプルルーム【シングルベッド】- ベッドエリア' }
                ]
            },
            suite: {
                images: [
                    { src: 'img/rooms/Western japanese room/room_wayou500.jpg', alt: '和洋室 6帖和室＋洋室ツイン - 和洋室全体' },
                    { src: 'img/rooms/Western japanese room/room_wayou500 - Copy.jpg', alt: '和洋室 6帖和室＋洋室ツイン - 和室エリア' }
                ]
            },
            onsen: {
                images: [
                    { src: 'img/rooms/family japanese room/room_family_500.jpg', alt: 'ファミリー和洋室 15帖和洋室＋洋室ツイン - ファミリー和洋室全体' },
                    { src: 'img/rooms/family japanese room/room_family_500 - Copy.jpg', alt: 'ファミリー和洋室 15帖和洋室＋洋室ツイン - リビングエリア' }
                ]
            }
        };

        return carouselData[planType] || carouselData.standard;
    }


    function updatePageContent(planType) {
        const currentPlan = PLAN_DATA[planType] || PLAN_DATA.standard;

        // Update breadcrumb
        const breadcrumbCurrent = document.querySelector('.breadcrumb .current');
        if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = currentPlan.breadcrumb;
        }

        // Update page title
        const planTitle = document.querySelector('.plan-title');
        if (planTitle) {
            planTitle.textContent = currentPlan.title;
        }

        // Update subtitle
        const planSubtitle = document.querySelector('.plan-subtitle');
        if (planSubtitle) {
            planSubtitle.textContent = currentPlan.subtitle;
        }

        // Update room specifications
        const roomSpecs = document.querySelectorAll('.spec-value');
        if (roomSpecs.length >= 5) {
            roomSpecs[0].textContent = currentPlan.roomSize; // 客室面積
            roomSpecs[1].textContent = currentPlan.bedType; // ベッドサイズ
            roomSpecs[2].textContent = currentPlan.capacity; // 定員
            roomSpecs[3].textContent = currentPlan.view; // 眺望
        }

        // Update base pricing (已含税)
        window.currentPriceWithTax = currentPlan.priceWithTax;
        if (elements.roomPriceElement) {
            elements.roomPriceElement.textContent = currentPlan.priceWithTax.toLocaleString();
        }
    }

    function initializeCarouselEvents() {
        // Carousel navigation buttons
        if (elements.carouselPrev) {
            elements.carouselPrev.addEventListener('click', () => {
                currentSlide = currentSlide > 0 ? currentSlide - 1 : totalSlides - 1;
                updateCarousel();
            });
        }

        if (elements.carouselNext) {
            elements.carouselNext.addEventListener('click', () => {
                currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
                updateCarousel();
            });
        }

        // Use event delegation for dynamic content
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('indicator')) {
                currentSlide = parseInt(e.target.getAttribute('data-slide'));
                updateCarousel();
            }
            if (e.target.classList.contains('thumbnail')) {
                currentSlide = parseInt(e.target.getAttribute('data-slide'));
                updateCarousel();
            }
        });
    }

    function updateCarousel() {
        if (elements.carouselTrack) {
            const translateX = -(currentSlide * (100 / totalSlides));
            elements.carouselTrack.style.transform = `translateX(${translateX}%)`;
        }

        // Update indicators
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentSlide);
        });

        // Update thumbnails
        document.querySelectorAll('.thumbnail').forEach((thumbnail, index) => {
            thumbnail.classList.toggle('active', index === currentSlide);
        });
    }

    // Auto-slide functionality removed - manual control only

    // Smooth scroll for back to top
    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', function(e) {
            // Allow normal navigation but add smooth scroll to top of target page
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Simplified card animations - use CSS instead of JS for better performance
    const cards = document.querySelectorAll('.plan-header-card, .room-gallery-card, .room-details-card, .amenities-card, .facilities-card, .policies-card');
    if (cards.length > 0) {
        // Add CSS animation class instead of JS observer
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 100}ms`;
            card.classList.add('fade-in-up');
        });
    }

    // Simplified hover effects using CSS classes
    const facilityItems = document.querySelectorAll('.facility-item');
    facilityItems.forEach(item => {
        item.classList.add('hover-slide');
    });

    // Function to update page content based on plan type (using consolidated data)
    function updatePlanContent(planType) {
        const planData = PLAN_DATA[planType] || PLAN_DATA.standard;

        if (planData) {
            // Update plan title and subtitle
            const planTitle = document.querySelector('.plan-title');
            const planSubtitle = document.querySelector('.plan-subtitle');
            const breadcrumbCurrent = document.querySelector('.breadcrumb .current');

            if (planTitle) planTitle.textContent = planData.title;
            if (planSubtitle) planSubtitle.textContent = planData.subtitle;
            if (breadcrumbCurrent) breadcrumbCurrent.textContent = planData.breadcrumb;

            // Update basic info
            const infoItems = document.querySelectorAll('.info-item');
            if (infoItems.length >= 4) {
                infoItems[0].querySelector('span').textContent = planData.bedType;
                infoItems[1].querySelector('span').textContent = planData.maxGuests;
                infoItems[3].querySelector('span').textContent = planData.meals;
            }

            // Update room specs
            const specValues = document.querySelectorAll('.spec-value');
            if (specValues.length >= 3) {
                specValues[0].textContent = planData.area;
                specValues[1].textContent = planData.bedSize;
                specValues[2].textContent = planData.maxGuests;
            }

            // Update pricing
            window.currentBasePrice = planData.basePrice;

            // Update description
            const description = document.querySelector('.plan-description');
            if (description) {
                description.textContent = planData.description;
            }
        }
    }


    console.log('Plan detail page initialized successfully');
});