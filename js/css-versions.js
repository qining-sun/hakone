/**
 * 全局 CSS 版本号配置
 * 只包含多页面共用的 CSS，修改这里即可更新所有页面
 * 单页面专用的 CSS 版本号在各自 HTML 中管理
 */
const CSS_VERSIONS = {
    'style.css': '20251128',
    // modern-navbar.css 版本号在各HTML中单独管理
    'footer.css': '20251128'
};

/**
 * 自动更新页面中所有 CSS 链接的版本号
 * 在 DOM 加载前执行，避免样式闪烁
 */
(function() {
    // 获取所有 CSS link 标签
    const links = document.querySelectorAll('link[rel="stylesheet"]');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return; // 跳过外部 CSS

        // 提取文件名
        const fileName = href.split('/').pop().split('?')[0];

        // 如果有对应的版本号，更新 href
        if (CSS_VERSIONS[fileName]) {
            const basePath = href.split('?')[0];
            link.setAttribute('href', `${basePath}?v=${CSS_VERSIONS[fileName]}`);
        }
    });
})();
