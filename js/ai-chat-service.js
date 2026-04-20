/**
 * 🤖 AI客服集成服务
 * Trip7箱根仙石原温泉ホテル< - AI智能客服
 */

class AIFrontdeskService {
    constructor(config = {}) {
        // 使用Node.js API服务器的代理路径，避免 CORS 问题
        this.apiUrl = config.apiUrl || (window.API_CONFIG?.CHATBOT_API || `http://${window.location.hostname}:5001/api/ai-proxy`);
        this.timeout = config.timeout || 40000; // 40秒超时
        this.conversationId = this.generateConversationId();
        this.conversationHistory = [];
        this.userId = config.userId || null; // 用户唯一标识符
        this.userLang = this.detectUserLanguage(); // 检测用户语言
        
        // 回调函数
        this.onMessage = config.onMessage || this.defaultOnMessage;
        this.onError = config.onError || this.defaultOnError;
        this.onLoading = config.onLoading || this.defaultOnLoading;
    }
    
    /**
     * 检测用户客户端语言
     * @returns {string} 语言代码: cn, jp, en
     */
    detectUserLanguage() {
        try {
            // 首先检查是否有保存的用户语言选择
            const savedLang = localStorage.getItem('ai_chat_language');
            if (savedLang && ['cn', 'jp', 'en'].includes(savedLang)) {
                console.log('🌍 使用保存的用户语言选择:', savedLang);
                return savedLang;
            }
            
            // 获取浏览器语言设置
            const browserLang = navigator.language || navigator.userLanguage || 'en';
            const langCode = browserLang.toLowerCase();
            
            console.log('🌍 检测到浏览器语言:', browserLang);
            
            // 判断语言类型
            if (langCode.startsWith('zh')) {
                return 'cn'; // 中文（简体/繁体）
            } else if (langCode.startsWith('ja')) {
                return 'jp'; // 日文
            } else {
                return 'en'; // 其他语言默认英文
            }
        } catch (error) {
            console.warn('⚠️ 语言检测失败，使用默认语言:', error);
            return 'en'; // 默认英文
        }
    }
    
    /**
     * 生成对话ID
     */
    generateConversationId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 发送消息给AI客服
     * @param {string} message - 用户消息
     * @param {Object} options - 可选参数
     * @returns {Promise<string>} AI回复
     */
    async sendMessage(message, options = {}) {
        if (!message || typeof message !== 'string') {
            throw new Error('消息内容不能为空');
        }
        
        // 先显示用户消息（预处理显示）
        if (options.showUserMessage !== false) {
            this.onMessage(message, 'user');
        }
        
        // 显示加载状态
        this.onLoading(true);
        
        try {
            // 添加用户消息到历史记录
            const userMessage = {
                role: 'user',
                content: message.trim(),
                timestamp: new Date().toISOString()
            };
            
            this.conversationHistory.push(userMessage);
            
            // 获取用户ID
            const currentUserId = options.userId || this.userId;
            
            // 构建请求数据
            const requestData = {
                action: 'chat',
                data: {
                    id: this.conversationId,
                    lang: this.userLang, // 添加用户语言信息
                    user_status: {
                        user_id: currentUserId
                    },
                    conversation_history: [...this.conversationHistory]
                },
                timestamp: new Date().toISOString()
            };
            
            console.log('🚀 发送AI请求:', requestData);
            
            // 发送请求
            const response = await this.makeRequest(requestData);
            
            // 处理响应
            let aiReply = '';
            if (response.response) {
                aiReply = response.response;
            } else if (response.message) {
                aiReply = response.message;
            } else if (typeof response === 'string') {
                aiReply = response;
            } else {
                aiReply = '抱歉，我现在无法回复，请稍后再试。';
            }
            
            // 添加AI回复到历史记录
            const aiMessage = {
                role: 'assistant',
                content: aiReply,
                timestamp: new Date().toISOString()
            };
            
            this.conversationHistory.push(aiMessage);
            
            // 触发回调
            this.onMessage(aiReply, 'ai');
            
            console.log('✅ AI回复成功:', aiReply);
            return aiReply;
            
        } catch (error) {
            console.error('❌ AI请求失败:', error);
            this.onError(error);
            throw error;
        } finally {
            this.onLoading(false);
        }
    }
    
    /**
     * 发送HTTP请求
     */
    async makeRequest(data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            console.log('📡 发送API请求到:', this.apiUrl);
            console.log('📦 请求数据:', JSON.stringify(data, null, 2));
            
            // 首先检测是否为文件协议
            if (window.location.protocol === 'file:') {
                console.warn('⚠️  检测到文件协议访问，可能遇到CORS问题');
                console.log('💡 建议使用本地服务器: python local_server.py');
            }
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                mode: 'cors', // 明确指定CORS模式
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('📬 收到响应:', response.status, response.statusText);
            
            if (!response.ok) {
                // 尝试获取错误详情
                let errorDetail = '';
                try {
                    const errorData = await response.text();
                    errorDetail = errorData ? ` - ${errorData}` : '';
                } catch (e) {
                    // 忽略解析错误
                }
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}${errorDetail}`);
            }
            
            const result = await response.json();
            console.log('✅ API响应:', result);
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            console.error('❌ API请求失败:', error);
            
            // 详细的错误分析和用户友好的错误消息
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接或尝试刷新页面');
            }
            
            if (error instanceof TypeError && error.message.includes('fetch')) {
                const corsError = new Error('网络连接失败。可能的原因：\n1. CORS跨域限制\n2. 服务器不可达\n3. 网络连接问题\n\n建议解决方案：\n• 使用本地服务器访问页面\n• 检查API服务器是否运行\n• 查看浏览器控制台获取详细信息');
                corsError.isCORSError = true;
                throw corsError;
            }
            
            // 检查是否为CORS相关错误
            if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
                const corsError = new Error('跨域请求被浏览器阻止。\n\n请尝试以下解决方案：\n1. 使用本地Web服务器访问页面\n2. 让后端开发者添加CORS支持\n3. 查看调试页面获取详细信息');
                corsError.isCORSError = true;
                throw corsError;
            }
            
            throw error;
        }
    }
    


    
    /**
     * 清除对话历史
     */
    clearConversation() {
        this.conversationHistory = [];
        this.conversationId = this.generateConversationId();
        console.log('🗑️ 对话历史已清除');
    }
    
    /**
     * 获取对话历史
     */
    getConversationHistory() {
        return [...this.conversationHistory];
    }
    
    /**
     * 设置用户状态
     */
    setUserStatus(hotelName = null, userId = null) {
        if (hotelName) {
            this.hotelName = hotelName;
        }
        if (userId) {
            this.userId = userId;
        }
    }
    
    /**
     * 设置用户语言
     * @param {string} lang - 语言代码: cn, jp, en
     */
    setUserLanguage(lang) {
        if (['cn', 'jp', 'en'].includes(lang)) {
            this.userLang = lang;
            // 保存用户语言选择到本地存储
            localStorage.setItem('ai_chat_language', lang);
            console.log('🌍 手动设置用户语言为:', lang);
            
            // 通知UI更新语言显示
            if (this.onLanguageChange) {
                this.onLanguageChange(lang);
            }
        } else {
            console.warn('⚠️ 无效的语言代码:', lang, '支持的语言: cn, jp, en');
        }
    }
    
    /**
     * 获取当前用户语言
     * @returns {string} 当前语言代码
     */
    getUserLanguage() {
        return this.userLang;
    }
    

    

    
    // 默认回调函数
    defaultOnMessage(message, sender) {
        console.log(`💬 ${sender === 'ai' ? 'AI' : '用户'}: ${message}`);
    }
    
    defaultOnError(error) {
        console.error('❌ AI客服错误:', error.message);
        
        // 为CORS错误提供特殊处理
        if (error.isCORSError) {
            this.showCORSHelp(error.message);
        } else {
            alert(`AI客服暂时无法使用: ${error.message}`);
        }
    }
    
    /**
     * 显示CORS错误帮助信息
     */
    showCORSHelp(errorMessage) {
        const helpDialog = document.createElement('div');
        helpDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
        `;
        
        helpDialog.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                margin: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #e74c3c; margin-top: 0;">🚫 CORS错误</h3>
                <p style="line-height: 1.6; color: #2c3e50; white-space: pre-line;">${errorMessage}</p>
                
                <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #27ae60;">💡 快速解决方案</h4>
                    <ol style="margin: 0; padding-left: 20px; color: #2c3e50;">
                        <li>运行本地服务器：<code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">python local_server.py</code></li>
                        <li>或者访问：<a href="cors-debug.html" style="color: #3498db;">调试页面</a></li>
                        <li>或者让后端开发者添加CORS支持</li>
                    </ol>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 0 5px;
                    ">关闭</button>
                    <button onclick="window.open('cors-debug.html', '_blank')" style="
                        background: #27ae60;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 0 5px;
                    ">打开调试页面</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpDialog);
        
        // 点击背景关闭
        helpDialog.addEventListener('click', (e) => {
            if (e.target === helpDialog) {
                helpDialog.remove();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                helpDialog.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    defaultOnLoading(isLoading) {
        console.log(isLoading ? '⏳ AI思考中...' : '✅ AI回复完成');
    }
}

/**
 * 🎨 简单聊天UI组件
 */
class SimpleChatUI {
    constructor(container, aiService) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.aiService = aiService;
        this.isOpen = false;
        this.isSending = false; // 添加发送状态标识
        this.createUI();
        this.bindEvents();
    }
    
    createUI() {
        this.container.innerHTML = `
            <!-- 聊天触发按钮 -->
            <div id="ai-chat-toggle" class="ai-chat-toggle">
                <div class="chat-icon"><img src="img/logo.ico" alt="AI客服" class="ai-logo-icon"></div>
                <span class="chat-text">Trip7 AI</span>
            </div>
            
            <!-- 聊天窗口 -->
            <div id="ai-chat-window" class="ai-chat-window">
                <div class="chat-header">
                    <div class="chat-title">
                        <span class="hotel-name">Trip7箱根仙石原温泉ホテル</span>
                        <span class="ai-name">Trip7 AI</span>
                    </div>
                    <div class="header-controls">
                        <div class="language-selector">
                            <button id="language-toggle" class="language-btn" title="切换语言/言語切替/Switch Language">
                                <span id="current-lang-display">🌍</span>
                            </button>
                            <div id="language-dropdown" class="language-dropdown">
                                <div class="language-option" data-lang="cn">🇨🇳 中文</div>
                                <div class="language-option" data-lang="jp">🇯🇵 日本語</div>
                                <div class="language-option" data-lang="en">🇺🇸 English</div>
                            </div>
                        </div>
                        <button class="chat-close">×</button>
                    </div>
                </div>
                
                <div class="chat-messages" id="ai-chat-messages">
                    <div class="ai-message">
                        <div class="message-avatar"><img src="img/logo.ico" alt="AI客服" class="ai-avatar-icon"></div>
                        <div class="message-content" id="welcome-message">
                            Trip7箱根仙石原温泉ホテルへようこそ！私はTrip7箱根仙石原温泉ホテルのフロント助手の小飛です。お手伝いできることがございましたら、お気軽にお声かけください！
                        </div>
                    </div>
                </div>
                
                
                <div class="chat-input">
                    <input type="text" id="ai-chat-input" placeholder="ご質問をお聞かせください..." maxlength="500">
                    <button id="ai-chat-send">送信</button>
                </div>
                
                <div class="loading-indicator" id="ai-loading" style="display: none;">
                    <span id="loading-text">AI処理中</span>
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // 切换聊天窗口
        const toggle = this.container.querySelector('#ai-chat-toggle');
        const window = this.container.querySelector('#ai-chat-window');
        const close = this.container.querySelector('.chat-close');
        
        toggle.addEventListener('click', () => this.toggleChat());
        close.addEventListener('click', () => this.closeChat());
        
        // 发送消息
        const input = this.container.querySelector('#ai-chat-input');
        const sendBtn = this.container.querySelector('#ai-chat-send');
        
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        
        // 语言切换功能
        this.bindLanguageEvents();
        
        // 设置AI服务回调
        this.aiService.onMessage = (message, sender) => this.displayMessage(message, sender);
        this.aiService.onLoading = (isLoading) => this.showLoading(isLoading);
        this.aiService.onError = (error) => this.showError(error);
        this.aiService.onLanguageChange = (lang) => this.updateLanguageDisplay(lang);
        
        // 初始化语言显示
        this.updateLanguageDisplay(this.aiService.getUserLanguage());
    }
    
    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = this.container.querySelector('#ai-chat-window');
        window.style.display = this.isOpen ? 'flex' : 'none';
        
        if (this.isOpen) {
            this.container.querySelector('#ai-chat-input').focus();
        }
    }
    
    closeChat() {
        this.isOpen = false;
        const window = this.container.querySelector('#ai-chat-window');
        window.style.display = 'none';
    }
    
    async sendMessage() {
        const input = this.container.querySelector('#ai-chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // 防止重复发送 - 检查是否正在发送
        if (this.isSending) {
            console.log('⚠️ 消息正在发送中，跳过重复请求');
            return;
        }
        
        this.isSending = true;
        input.value = '';
        
        try {
            // 注意：不要在这里显示用户消息，因为aiService.sendMessage会处理显示
            await this.aiService.sendMessage(message, { showUserMessage: true });
        } catch (error) {
            console.error('发送消息失败:', error);
        } finally {
            this.isSending = false;
        }
    }
    
    
    displayMessage(message, sender) {
        const messagesContainer = this.container.querySelector('#ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        
        // 处理消息内容
        let processedMessage;
        if (sender === 'ai') {
            // AI消息支持Markdown转换
            processedMessage = this.parseMarkdown(message);
        } else {
            // 用户消息进行HTML转义
            processedMessage = this.escapeHtml(message);
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${sender === 'ai' ? '<img src="img/logo.ico" alt="AI客服" class="ai-avatar-icon">' : '👤'}</div>
            <div class="message-content">${processedMessage}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    showLoading(isLoading) {
        const loading = this.container.querySelector('#ai-loading');
        loading.style.display = isLoading ? 'flex' : 'none';
        
        if (isLoading) {
            const messagesContainer = this.container.querySelector('#ai-chat-messages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    showError(error) {
        this.displayMessage(`抱歉，出现了错误: ${error.message}`, 'ai');
    }
    
    addMessage(message, sender) {
        this.displayMessage(message, sender);
    }
    
    /**
     * 解析Markdown内容为HTML
     * @param {string} text - Markdown文本
     * @returns {string} HTML文本
     */
    parseMarkdown(text) {
        try {
            // 检查marked库是否可用
            if (typeof marked !== 'undefined') {
                // 配置marked选项
                if (marked.setOptions) {
                    marked.setOptions({
                        breaks: true, // 支持换行
                        gfm: true,    // 支持GitHub风格Markdown
                        sanitize: false, // 不要删除HTML标签
                        highlight: null
                    });
                }
                
                // 转换Markdown为HTML
                return marked.parse(text);
            } else {
                console.warn('⚠️ Marked库未加载，回退到普通文本处理');
                return this.escapeHtml(text);
            }
        } catch (error) {
            console.error('❌ Markdown解析失败:', error);
            // 如果解析失败，回退到HTML转义
            return this.escapeHtml(text);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 绑定语言切换事件
     */
    bindLanguageEvents() {
        const langToggle = this.container.querySelector('#language-toggle');
        const langDropdown = this.container.querySelector('#language-dropdown');
        const langOptions = this.container.querySelectorAll('.language-option');
        
        // 切换下拉菜单显示
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.style.display = langDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // 选择语言
        langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const selectedLang = option.getAttribute('data-lang');
                this.aiService.setUserLanguage(selectedLang);
                langDropdown.style.display = 'none';
            });
        });
        
        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!langToggle.contains(e.target) && !langDropdown.contains(e.target)) {
                langDropdown.style.display = 'none';
            }
        });
    }
    
    /**
     * 更新语言显示
     */
    updateLanguageDisplay(lang) {
        const langDisplay = this.container.querySelector('#current-lang-display');
        const welcomeMessage = this.container.querySelector('#welcome-message');
        const inputPlaceholder = this.container.querySelector('#ai-chat-input');
        const sendButton = this.container.querySelector('#ai-chat-send');
        const loadingText = this.container.querySelector('#loading-text');
        
        // 语言映射
        const langMap = {
            'cn': {
                flag: '🇨🇳',
                welcome: '欢迎来到Trip7汤泽温泉酒店<！我是AI助手，有什么可以帮您的吗？',
                placeholder: '请输入您的问题...',
                sendBtn: '发送',
                loading: 'AI处理中'
            },
            'jp': {
                flag: '🇯🇵',
                welcome: 'Trip7箱根仙石原温泉ホテルへようこそ！私はAI助手です。お手伝いできることがございましたら、お気軽にお声かけください！',
                placeholder: 'ご質問をお聞かせください...',
                sendBtn: '送信',
                loading: 'AI処理中'
            },
            'en': {
                flag: '🇺🇸',
                welcome: 'Welcome to Trip7 Hakone Sengokuhara Onsen Hotel! I am an AI assistant. How can I help you today?',
                placeholder: 'Please enter your question...',
                sendBtn: 'Send',
                loading: 'AI Processing'
            }
        };
        
        const langData = langMap[lang] || langMap['jp'];
        
        // 更新UI文本
        if (langDisplay) langDisplay.textContent = langData.flag;
        if (welcomeMessage) welcomeMessage.textContent = langData.welcome;
        if (inputPlaceholder) inputPlaceholder.placeholder = langData.placeholder;
        if (sendButton) sendButton.textContent = langData.sendBtn;
        if (loadingText) loadingText.textContent = langData.loading;
        
        // 更新选择状态
        const langOptions = this.container.querySelectorAll('.language-option');
        langOptions.forEach(option => {
            option.classList.toggle('selected', option.getAttribute('data-lang') === lang);
        });
        
        console.log('🌍 UI语言已更新为:', lang);
    }
}

// 🧪 测试Markdown功能的辅助函数
window.testMarkdown = function() {
    const testMessages = [
        "## 箱根ホテル案内\n\n温泉地の**温泉ホテル**へようこそ！\n\n### 主要设施\n\n1. **展望露天風呂** - 24時間利用可能\n2. **アートギャラリー** - 地元芸術家の作品展示\n3. **レストラン** - 地元食材を使った料理\n\n> お客様に最高のサービスを提供いたします。\n\n詳細は `reception@hotel.com` までお問い合わせください。",
        "**客室料金**\n\n- スタンダード: ¥12,000~/泊\n- デラックス: ¥18,000~/泊  \n- スイート: ¥25,000~/泊\n\n```\n特別割引: 連泊割引10%OFF\n```\n\n*料金は税込み表示です*",
        "### チェックイン・アウト\n\n- **チェックイン**: 15:00\n- **チェックアウト**: 11:00\n\n---\n\n### アクセス\n\n最寄り駅から`無料送迎バス`で15分です。"
    ];
    
    console.log('🧪 开始测试Markdown渲染...');
    testMessages.forEach((msg, index) => {
        console.log(`测试消息 ${index + 1}:`, msg);
    });
    
    return testMessages;
};

// 全局快速初始化函数
window.initAIFrontdesk = function(options = {}) {
    const aiService = new AIFrontdeskService(options);
    
    const container = options.container || '#ai-chat-container';
    const chatContainer = document.querySelector(container);
    
    if (!chatContainer) {
        console.error('找不到聊天容器:', container);
        return null;
    }
    
    const chatUI = new SimpleChatUI(chatContainer, aiService);
    
    return {
        service: aiService,
        ui: chatUI,
        sendMessage: (message) => aiService.sendMessage(message),
        clearHistory: () => aiService.clearConversation(),
        setUserStatus: (hotelName, userId) => aiService.setUserStatus(hotelName, userId),
        setUserLanguage: (lang) => aiService.setUserLanguage(lang),
        getUserLanguage: () => aiService.getUserLanguage()
    };
};

console.log('🤖 AI前台客服服务已加载完成');