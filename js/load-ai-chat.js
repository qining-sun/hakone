/**
 * AI聊天机器人加载器
 * 自动加载Trip7 AI聊天组件到页面中
 */

(function() {
    // 创建AI聊天容器占位符
    const placeholder = document.createElement('div');
    placeholder.id = 'ai-chat-placeholder';
    document.body.appendChild(placeholder);

    // 加载AI聊天组件
    fetch(`components/ai-chat.html?v=${Date.now()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载AI聊天组件');
            }
            return response.text();
        })
        .then(html => {
            placeholder.innerHTML = html;

            // 执行组件中的脚本
            const scripts = placeholder.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');

                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }

                document.body.appendChild(newScript);
            });

            // 加载组件中的样式（添加版本参数防止缓存）
            const styles = placeholder.querySelectorAll('link[rel="stylesheet"]');
            styles.forEach(link => {
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                // 添加版本参数防止缓存
                const href = link.href;
                newLink.href = href.includes('?') ? `${href}&v=${Date.now()}` : `${href}?v=${Date.now()}`;
                document.head.appendChild(newLink);
            });

            console.log('✅ AI聊天组件加载完成');
        })
        .catch(error => {
            console.error('❌ AI聊天组件加载失败:', error);
        });
})();
