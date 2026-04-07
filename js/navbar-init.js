/**
 * Modern Navbar Initialization Script
 * 统一的导航栏初始化功能
 */

(function() {
    'use strict';

    // 确保DOM加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbar);
    } else {
        initNavbar();
    }

    function initNavbar() {
        const navbar = document.getElementById('modernNavbar');
        const navbarToggle = document.getElementById('navbarToggle');
        const navbarMenu = document.getElementById('navbarMenu');
        const navbarOverlay = document.getElementById('navbarOverlay');

        if (!navbar) {
            console.warn('Modern navbar not found');
            return;
        }

        // 初始化滚动效果
        initScrollEffect(navbar);

        // 初始化移动菜单
        initMobileMenu(navbarToggle, navbarMenu, navbarOverlay);

        // 设置当前活动菜单项
        setActiveMenuItem();
    }

    /**
     * 初始化滚动效果
     */
    function initScrollEffect(navbar) {
        let lastScroll = 0;
        let ticking = false;

        window.addEventListener('scroll', () => {
            lastScroll = window.pageYOffset;

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (lastScroll > 100) {
                        navbar.classList.add('sticky');
                    } else {
                        navbar.classList.remove('sticky');
                    }
                    ticking = false;
                });

                ticking = true;
            }
        });
    }

    /**
     * 初始化移动菜单
     */
    function initMobileMenu(toggle, menu, overlay) {
        if (!toggle || !menu) return;

        function toggleMenu() {
            document.body.classList.toggle('navbar-open');
            toggle.classList.toggle('active');
            menu.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        }

        toggle.addEventListener('click', toggleMenu);

        if (overlay) {
            overlay.addEventListener('click', toggleMenu);
        }

        // 点击菜单项时关闭移动菜单
        const menuLinks = menu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    toggleMenu();
                }
            });
        });
    }

    /**
     * 设置当前活动菜单项
     */
    function setActiveMenuItem() {
        const currentPage = window.location.pathname.split('/').pop() || 'reservation.html';
        const navItems = document.querySelectorAll('.nav-item');

        // 先移除所有active类
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        // 遍历所有导航项，激活匹配的按钮
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            const itemText = item.textContent.trim();

            // 如果是reservation.html页面，激活"ご予約"按钮
            if (currentPage === 'reservation.html' || currentPage === '') {
                if (itemText === 'ご予約' && (href === 'reservation.html' || href.endsWith('/reservation.html'))) {
                    item.classList.add('active');
                }
            }
            // 其他booking项目页面，匹配当前页面
            else if (href === currentPage || href.endsWith('/' + currentPage)) {
                item.classList.add('active');
            }
        });
    }
})();
