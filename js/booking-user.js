// Booking Page JavaScript

// 使用动态主机名构建API地址，支持通过IP访问
window.API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

let currentStep = 1;
const maxSteps = 4; // 4 steps: 1.予約内容 2.確認 3.支払い・決済 4.完了

// ==================== Page Loading Management ====================
let isPageDataLoaded = false;

// Hide page content and show loading overlay initially
function showPageContent() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const pageContent = document.getElementById('pageContent');

    if (loadingOverlay && pageContent) {
        // Fade out loading overlay
        loadingOverlay.classList.add('fade-out');

        // Fade in page content
        setTimeout(() => {
            pageContent.classList.add('fade-in');
        }, 100);

        // Remove loading overlay from DOM after animation
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 600);

        console.log('✅ Page content displayed');
    }
}

// Function to check if all data is loaded
async function checkDataLoaded() {
    console.log('Checking if all data is loaded...');

    // Wait for all critical data to load
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code') || urlParams.get('plan') || 'twin';
    const checkin = urlParams.get('checkin') || '';
    const checkout = urlParams.get('checkout') || '';
    const adults = parseInt(urlParams.get('adults') || '2');

    try {
        // Wait for room data to be fetched using search API
        if (!roomDataCache[code] && checkin && checkout) {
            const searchApiUrl = window.getApiUrl(`/rooms/search?checkin=${checkin}&checkout=${checkout}&adults=${adults}&rooms=1`);
            const response = await fetch(searchApiUrl);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    const roomData = result.data.find(r => r.room_type_code === code);
                    if (roomData) {
                        roomDataCache[code] = {
                            price: Math.round(roomData.price_per_night),
                            name: roomData.room_type_name || ''
                        };
                    }
                }
            }
        }

        console.log('All data loaded successfully');
        isPageDataLoaded = true;
        showPageContent();
    } catch (error) {
        console.error('Error loading data:', error);
        // Show page anyway after error
        setTimeout(() => {
            showPageContent();
        }, 500);
    }
}

// ==================== 30分钟倒计时 ====================
let expirationTimer = null;
let displayTimer = null;
const EXPIRATION_TIME = 30 * 60 * 1000; // 30分钟（后备方案）
let expirationTime = null;

function startExpirationTimer(expiresAt) {
    // 清除之前的计时器
    clearExpirationTimer();

    // 如果提供了数据库的过期时间，使用它
    if (expiresAt) {
        const expiresAtTime = new Date(expiresAt).getTime();
        expirationTime = expiresAtTime;
        console.log('⏰ 使用数据库过期时间:', new Date(expiresAt).toLocaleString('ja-JP'));
    } else {
        // 否则使用默认的30分钟
        expirationTime = Date.now() + EXPIRATION_TIME;
        console.log('⏰ 使用默认30分钟倒计时');
    }

    const remaining = Math.max(0, expirationTime - Date.now());

    // 如果已经过期
    if (remaining === 0) {
        alert('ご予約の有効期限が切れました。予約ページに戻ります。');
        window.location.href = 'reservation.html';
        return;
    }

    // 主倒计时 - 剩余时间后过期
    expirationTimer = setTimeout(() => {
        clearDisplayTimer();
        alert('ご予約の有効期限が切れました。予約ページに戻ります。');
        window.location.href = 'reservation.html';
    }, remaining);

    // 显示倒计时 - 每秒更新
    updateTimerDisplay();
    displayTimer = setInterval(updateTimerDisplay, 1000);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    console.log(`⏰ 倒计时已启动，剩余时间: ${minutes}分${seconds}秒`);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerElement = document.getElementById('expirationTimer');

    if (!timerDisplay || !expirationTime) return;

    const remaining = Math.max(0, expirationTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // 剩余5分钟时变红
    if (remaining <= 5 * 60 * 1000 && timerElement) {
        timerElement.classList.add('warning');
    }

    // 时间到
    if (remaining === 0) {
        clearDisplayTimer();
    }
}

function clearDisplayTimer() {
    if (displayTimer) {
        clearInterval(displayTimer);
        displayTimer = null;
    }
}

function clearExpirationTimer() {
    if (expirationTimer) {
        clearTimeout(expirationTimer);
        expirationTimer = null;
    }
    clearDisplayTimer();
    expirationTime = null;
    console.log('⏰ 倒计时已清除');
}

document.addEventListener('DOMContentLoaded', async function() {

    // 不在这里启动倒计时，等待数据加载后再启动
    // startExpirationTimer();

    // Initialize OrderTemp module first (to store booking params)
    if (window.OrderTemp && typeof window.OrderTemp.init === 'function') {
        console.log('🔄 Initializing OrderTemp module...');
        window.OrderTemp.init();
    }


    // Start loading data
    checkDataLoaded();

    // Initialize page
    initializePage();
    setupEventListeners();
    updateReservationInfo();

    // Enable country code search by typing
    enableCountryCodeSearch();

    // Setup email verification
    setupEmailVerification();

    // Setup katakana validation
    setupKatakanaValidation();

    // Setup foreigner checkbox handlers
    setupForeignerCheckboxes();

    // Setup country selection handler
    setupCountrySelectionHandler();

    // Auto-fill user information (delayed to ensure storage is ready)
    setTimeout(async function() {
        console.log('准备执行 autofillUserInfo...');
        await autofillUserInfo();
    }, 500);

    console.log('Booking page initialized (User Mode)');
});

// Enable typing search in country code select
function enableCountryCodeSearch() {
    const select = document.getElementById('countryCode');
    if (!select) return;

    let searchText = '';
    let searchTimeout;

    select.addEventListener('keydown', function(e) {
        // Clear previous timeout
        clearTimeout(searchTimeout);

        // Only handle character keys and numbers
        if (e.key.length === 1) {
            searchText += e.key;

            // Find matching option
            const options = Array.from(select.options);
            const match = options.find(option => {
                const text = option.textContent.toLowerCase();
                const value = option.value.toLowerCase();
                return text.includes(searchText.toLowerCase()) ||
                       value.includes(searchText.toLowerCase());
            });

            if (match) {
                select.value = match.value;
            }
        }

        // Clear search text after 1 second
        searchTimeout = setTimeout(() => {
            searchText = '';
        }, 1000);
    });
}

// Email Verification System
let emailVerified = false;
let verificationCodeSent = false;
let correctVerificationCode = '';

function setupEmailVerification() {
    const emailInput = document.getElementById('email');
    const sendBtn = document.getElementById('sendVerificationBtn');
    const verifyBtn = document.getElementById('verifyCodeBtn');
    const codeInput = document.getElementById('verificationCode');

    if (!emailInput || !sendBtn || !verifyBtn) return;

    // Send verification code
    sendBtn.addEventListener('click', function() {
        const email = emailInput.value.trim();

        if (!email) {
            showVerificationStatus('emailVerificationStatus', 'メールアドレスを入力してください', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showVerificationStatus('emailVerificationStatus', '有効なメールアドレスを入力してください', 'error');
            return;
        }

        // Disable button and show loading
        sendBtn.disabled = true;
        sendBtn.textContent = '送信中...';

        // Simulate sending email (in production, this would be an API call)
        setTimeout(() => {
            // Set fixed verification code
            correctVerificationCode = '888888';

            // In production, send this code via email API
            console.log('Verification code:', correctVerificationCode);

            verificationCodeSent = true;

            // Show success message
            showVerificationStatus('emailVerificationStatus',
                `認証コードを ${email} に送信しました。メールをご確認ください。`, 'success');

            // Show verification code input row
            document.getElementById('verificationCodeRow').style.display = 'block';

            // Start countdown timer (60 seconds)
            startCountdown(sendBtn, 60);

        }, 1500);
    });

    // Verify code
    verifyBtn.addEventListener('click', function() {
        const code = codeInput.value.trim();

        if (!code) {
            showVerificationStatus('codeVerificationStatus', '認証コードを入力してください', 'error');
            return;
        }

        if (code.length !== 6) {
            showVerificationStatus('codeVerificationStatus', '6桁の認証コードを入力してください', 'error');
            return;
        }

        // Verify code
        if (code === correctVerificationCode) {
            emailVerified = true;
            showVerificationStatus('codeVerificationStatus', 'メールアドレスの認証が完了しました！', 'success');

            // Disable inputs
            codeInput.disabled = true;
            verifyBtn.disabled = true;
            emailInput.disabled = true;
            sendBtn.disabled = true;

            // Update button text
            verifyBtn.textContent = '認証済み ✓';
            verifyBtn.style.background = '#28a745';

        } else {
            showVerificationStatus('codeVerificationStatus', '認証コードが正しくありません', 'error');
        }
    });

    // Allow enter key to verify
    codeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyBtn.click();
        }
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showVerificationStatus(elementId, message, type) {
    const statusElement = document.getElementById(elementId);
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `verification-status ${type}`;
}

function startCountdown(button, seconds) {
    let remaining = seconds;

    const interval = setInterval(() => {
        button.textContent = `再送信 (${remaining}秒)`;
        remaining--;

        if (remaining < 0) {
            clearInterval(interval);
            button.disabled = false;
            button.textContent = '認証コード再送信';
        }
    }, 1000);
}

// Katakana Validation System
function setupKatakanaValidation() {
    const katakanaFields = [
        { inputId: 'lastNameKana', errorId: 'lastNameKanaError' },
        { inputId: 'firstNameKana', errorId: 'firstNameKanaError' },
        { inputId: 'guestLastNameKana', errorId: 'guestLastNameKanaError' },
        { inputId: 'guestFirstNameKana', errorId: 'guestFirstNameKanaError' }
    ];

    katakanaFields.forEach(({ inputId, errorId }) => {
        const field = document.getElementById(inputId);
        if (field) {
            // Clear error on input
            field.addEventListener('input', function(e) {
                clearKatakanaError(inputId, errorId);
                validateKatakana(e.target);
            });

            // Validate on blur
            field.addEventListener('blur', function(e) {
                validateKatakana(e.target);
            });
        }
    });
}

function validateKatakana(field) {
    const value = field.value;

    // Full-width katakana regex: [\u30A0-\u30FF] includes all katakana characters
    // Also allow middle dot (・) and long vowel mark (ー)
    const katakanaRegex = /^[ァ-ヶー・\s]+$/;

    if (value && !katakanaRegex.test(value)) {
        // Invalid input - contains non-katakana characters
        field.style.borderColor = '#dc3545';

        // Show error message
        let errorMsg = field.parentElement.querySelector('.katakana-error');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'katakana-error';
            errorMsg.style.cssText = 'color: #dc3545; font-size: 12px; margin-top: 5px;';
            field.parentElement.appendChild(errorMsg);
        }
        errorMsg.textContent = '全角カタカナで入力してください';

        return false;
    } else {
        // Valid input
        field.style.borderColor = '#e9ecef';

        // Remove error message if exists
        const errorMsg = field.parentElement.querySelector('.katakana-error');
        if (errorMsg) {
            errorMsg.remove();
        }

        return true;
    }
}

function isValidKatakana(value) {
    if (!value) return true; // Empty is valid (required validation handles this)
    const katakanaRegex = /^[ァ-ヶー・\s]+$/;
    return katakanaRegex.test(value);
}

// 显示片假名错误信息
function showKatakanaError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(errorId);

    if (input) {
        input.style.borderColor = '#dc3545';
    }
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// 清除片假名错误信息
function clearKatakanaError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(errorId);

    if (input) {
        input.style.borderColor = '';
    }
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Foreigner Checkbox Handlers
function setupForeignerCheckboxes() {
    // Booker foreigner checkbox
    const isForeignerCheckbox = document.getElementById('isForeigner');
    const kanaRow = document.getElementById('kanaRow');
    const lastNameKana = document.getElementById('lastNameKana');
    const firstNameKana = document.getElementById('firstNameKana');

    // Store original katakana values
    let savedLastNameKana = '';
    let savedFirstNameKana = '';

    if (isForeignerCheckbox && kanaRow) {
        // Save initial values if they exist (from database)
        if (lastNameKana && lastNameKana.value) {
            savedLastNameKana = lastNameKana.value;
        }
        if (firstNameKana && firstNameKana.value) {
            savedFirstNameKana = firstNameKana.value;
        }

        isForeignerCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Save current values before clearing
                if (lastNameKana && lastNameKana.value) {
                    savedLastNameKana = lastNameKana.value;
                }
                if (firstNameKana && firstNameKana.value) {
                    savedFirstNameKana = firstNameKana.value;
                }

                // Hide katakana fields
                kanaRow.style.display = 'none';
                // Remove required attribute
                if (lastNameKana) lastNameKana.removeAttribute('required');
                if (firstNameKana) firstNameKana.removeAttribute('required');
                // Clear values
                if (lastNameKana) lastNameKana.value = '';
                if (firstNameKana) firstNameKana.value = '';
                // Clear any error states
                if (lastNameKana) {
                    lastNameKana.style.borderColor = '#e9ecef';
                    const error = lastNameKana.parentElement.querySelector('.katakana-error');
                    if (error) error.remove();
                }
                if (firstNameKana) {
                    firstNameKana.style.borderColor = '#e9ecef';
                    const error = firstNameKana.parentElement.querySelector('.katakana-error');
                    if (error) error.remove();
                }
            } else {
                // Show katakana fields
                kanaRow.style.display = 'grid';
                // Add required attribute
                if (lastNameKana) lastNameKana.setAttribute('required', '');
                if (firstNameKana) firstNameKana.setAttribute('required', '');
                // Restore saved values
                if (lastNameKana && savedLastNameKana) {
                    lastNameKana.value = savedLastNameKana;
                }
                if (firstNameKana && savedFirstNameKana) {
                    firstNameKana.value = savedFirstNameKana;
                }
            }
        });
    }

    // Guest foreigner checkbox
    const isGuestForeignerCheckbox = document.getElementById('isGuestForeigner');
    const guestKanaRow = document.getElementById('guestKanaRow');
    const guestLastNameKana = document.getElementById('guestLastNameKana');
    const guestFirstNameKana = document.getElementById('guestFirstNameKana');

    if (isGuestForeignerCheckbox && guestKanaRow) {
        isGuestForeignerCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Hide katakana fields
                guestKanaRow.style.display = 'none';
                // Remove required attribute
                if (guestLastNameKana) guestLastNameKana.removeAttribute('required');
                if (guestFirstNameKana) guestFirstNameKana.removeAttribute('required');
                // Clear values
                if (guestLastNameKana) guestLastNameKana.value = '';
                if (guestFirstNameKana) guestFirstNameKana.value = '';
                // Clear any error states
                if (guestLastNameKana) {
                    guestLastNameKana.style.borderColor = '#e9ecef';
                    const error = guestLastNameKana.parentElement.querySelector('.katakana-error');
                    if (error) error.remove();
                }
                if (guestFirstNameKana) {
                    guestFirstNameKana.style.borderColor = '#e9ecef';
                    const error = guestFirstNameKana.parentElement.querySelector('.katakana-error');
                    if (error) error.remove();
                }
            } else {
                // Show katakana fields
                guestKanaRow.style.display = 'grid';
                // Add required attribute
                if (guestLastNameKana) guestLastNameKana.setAttribute('required', '');
                if (guestFirstNameKana) guestFirstNameKana.setAttribute('required', '');
            }
        });
    }
}

// Setup country selection handler
function setupCountrySelectionHandler() {
    const countrySelect = document.getElementById('country');
    const japanAddressFields = document.getElementById('japanAddressFields');
    const internationalAddressFields = document.getElementById('internationalAddressFields');

    if (countrySelect && japanAddressFields && internationalAddressFields) {
        countrySelect.addEventListener('change', function() {
            const selectedCountry = this.value;

            if (selectedCountry === 'japan') {
                // Show Japan address fields
                japanAddressFields.style.display = 'block';
                internationalAddressFields.style.display = 'none';

                // Set required attributes for Japan fields
                document.getElementById('postalCode').setAttribute('required', '');
                document.getElementById('prefecture').setAttribute('required', '');
                document.getElementById('address').setAttribute('required', '');

                // Remove required from international fields
                document.getElementById('stateProvince').removeAttribute('required');
                document.getElementById('cityDistrict').removeAttribute('required');
                document.getElementById('streetAddress').removeAttribute('required');
            } else {
                // Show international address fields
                japanAddressFields.style.display = 'none';
                internationalAddressFields.style.display = 'block';

                // Remove required from Japan fields
                document.getElementById('postalCode').removeAttribute('required');
                document.getElementById('prefecture').removeAttribute('required');
                document.getElementById('address').removeAttribute('required');

                // Set required attributes for international fields
                document.getElementById('stateProvince').setAttribute('required', '');
                document.getElementById('cityDistrict').setAttribute('required', '');
                document.getElementById('streetAddress').setAttribute('required', '');
            }
        });
    }
}

// Initialize page with URL parameters
async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check if this is a guest booking with token
    const token = urlParams.get('token');
    if (token) {
        await handleGuestBookingToken(token);
        return;
    }

    // 检查是否有临时订单编号（支持 Chatbot 创建的订单）
    const tempOrderCode = urlParams.get('temp_order') || urlParams.get('order_code');
    if (tempOrderCode) {
        // ✅ 有临时订单编号，允许游客访问
        console.log('✓ 臨時予約コードでアクセス:', tempOrderCode);
        // 继续初始化页面，不需要登录
    } else {
        // 如果没有token和临时订单编号，检查是否是已登录用户
        let currentUser = null;

        // 检查是否刚从SNS登录跳转过来（Safari需要更多重试）
        const isSnsLogin = urlParams.get('sns_login') === '1';
        if (isSnsLogin) {
            console.log('[booking-user] 检测到SNS登录跳转，将增加重试次数');
        }

        // 等待 sessionService 加载（最多等待3秒）
        let attempts = 0;
        while (!window.sessionService && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        // 优先使用 sessionService 检查登录状态（SNS登录后可能需要多次重试）
        if (window.sessionService) {
            console.log('[booking-user] 正在检查登录状态...');
            // Safari SNS登录需要更多重试：10次，普通情况5次
            const maxRetries = isSnsLogin ? 10 : 5;
            const retryDelay = isSnsLogin ? 800 : 500;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    currentUser = await window.sessionService.getCurrentUser();
                    if (currentUser) {
                        console.log('[booking-user] 登录状态确认:', currentUser.email);
                        break;
                    }
                } catch (error) {
                    console.log(`[booking-user] 第${i+1}次检查失败:`, error.message);
                }
                if (i < maxRetries - 1) {
                    console.log(`[booking-user] 等待${retryDelay}ms后重试...`);
                    await new Promise(r => setTimeout(r, retryDelay));
                }
            }
            console.log('[booking-user] 登录状态检查结果:', currentUser ? '已登录' : '未登录');
        } else {
            console.warn('[booking-user] sessionService 未加载');
        }

        // 如果 sessionService 没有用户，再检查 localStorage
        if (!currentUser) {
            currentUser = window.safeStorage.getItem('currentUser');
            if (currentUser) {
                console.log('[booking-user] 从 localStorage 获取到用户');
            }
        }

        if (!currentUser) {
            // ❌ 未登录且无token/订单编号 - 拒绝访问
            console.error('アクセス拒否: ログインまたは有効な予約リンクが必要です');

            // 显示错误消息
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Noto Sans JP', sans-serif; background: #f5f5f5;">
                    <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px;">
                        <div style="font-size: 48px; color: #dc3545; margin-bottom: 20px;">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h2 style="color: #2c2c2c; margin-bottom: 15px;">アクセスが制限されています</h2>
                        <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
                            この予約ページにアクセスするには、有効な予約リンクまたはログインが必要です。
                        </p>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <a href="reservation.html" style="background: #8a7a5e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block;">
                                <i class="fas fa-home"></i> ホームへ戻る
                            </a>
                        </div>
                    </div>
                </div>
            `;
            return; // 停止初始化
        }
    }

    // ✅ 已登录用户可以正常访问
    console.log('✓ 登録ユーザーとしてアクセス');

    // Get reservation details from URL
    const checkin = urlParams.get('checkin') || getDefaultDate();
    const checkout = urlParams.get('checkout') || getDefaultDate(1);
    const adults = urlParams.get('adults') || '2';
    const children = urlParams.get('children') || '0';
    const code = urlParams.get('code') || urlParams.get('plan') || 'twin';
    const rooms = urlParams.get('rooms') || '1';

    // Update reservation info display
    updateReservationDisplay(checkin, checkout, adults, children, code, rooms);
}

// Handle guest booking token
async function handleGuestBookingToken(token) {
    try {
        console.log('=== ゲスト予約トークン処理 ===');
        console.log('Token:', token);

        // Show loading message
        showLoadingMessage('予約情報を読み込み中...');

        // Verify token with backend
        const response = await fetch(window.getApiUrl(`/guest/verify-token/${token}`));
        const result = await response.json();

        hideLoadingMessage();

        if (!response.ok || !result.success) {
            // Token is invalid or expired
            const message = result.message || 'リンクが無効です';
            showErrorMessage(message, true);
            return;
        }

        console.log('✓ トークン検証成功:', result.data);

        // Extract reservation parameters
        const { email, reservationParams, expiresAt } = result.data;

        // Show expiration notice
        if (expiresAt) {
            const expiresDate = new Date(expiresAt);
            const now = new Date();
            const minutesLeft = Math.floor((expiresDate - now) / 60000);
            if (minutesLeft < 30) {
                showInfoMessage(`このリンクの有効期限まで残り ${minutesLeft} 分です。お早めに予約を完了してください。`);
            }
        }

        // Fill email field and make it readonly
        const emailField = document.getElementById('email');
        if (emailField && email) {
            emailField.value = email;
            emailField.readOnly = true;
            emailField.style.backgroundColor = '#f8f9fa';

            // Skip email verification for guest bookings
            emailVerified = true;
            const verificationCodeRow = document.getElementById('verificationCodeRow');
            const sendVerificationBtn = document.getElementById('sendVerificationBtn');
            if (verificationCodeRow) {
                verificationCodeRow.style.display = 'none';
            }
            if (sendVerificationBtn) {
                sendVerificationBtn.style.display = 'none';
            }
        }

        // Update reservation display with parameters
        const checkin = reservationParams.checkin || getDefaultDate();
        const checkout = reservationParams.checkout || getDefaultDate(1);
        const adults = reservationParams.adults || '2';
        const children = reservationParams.children || '0';
        const code = reservationParams.code || reservationParams.plan || 'twin';
        const rooms = reservationParams.rooms || '1';

        updateReservationDisplay(checkin, checkout, adults, children, code, rooms);

        // 保留token在URL中以保持验证状态
        // 不删除token，确保整个预订流程都需要有效token
        window.guestBookingToken = token; // 保存到全局变量
        window.guestBookingEmail = email; // 保存游客邮箱

        console.log('✓ ゲスト予約情報が読み込まれました');

    } catch (error) {
        console.error('トークン処理エラー:', error);
        hideLoadingMessage();
        showErrorMessage('予約情報の読み込みに失敗しました。もう一度お試しください。', true);
    }
}

// Show loading message
function showLoadingMessage(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'guestBookingLoading';
    loadingDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    loadingDiv.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px;">
            <div style="font-size: 24px; margin-bottom: 15px;">
                <i class="fas fa-spinner fa-spin" style="color: #8a7a5e;"></i>
            </div>
            <div style="font-size: 16px; color: #2c2c2c;">${message}</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

// Hide loading message
function hideLoadingMessage() {
    const loadingDiv = document.getElementById('guestBookingLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Show error message
function showErrorMessage(message, isBlocking = false) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = isBlocking ?
        'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;' :
        'position: fixed; top: 20px; right: 20px; z-index: 10001;';

    errorDiv.innerHTML = `
        <div style="background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 400px; border-left: 4px solid #dc3545;">
            <div style="display: flex; align-items: start; gap: 12px;">
                <i class="fas fa-exclamation-circle" style="color: #dc3545; font-size: 24px; margin-top: 2px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2c2c2c; margin-bottom: 8px;">エラー</div>
                    <div style="color: #666; line-height: 1.5; margin-bottom: 15px;">${message}</div>
                    <button onclick="window.location.href='reservation.html'" style="background: #8a7a5e; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                        予約ページに戻る
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(errorDiv);

    if (!isBlocking) {
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Show info message
function showInfoMessage(message) {
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10001;';
    infoDiv.innerHTML = `
        <div style="background: #fff3cd; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 350px; border-left: 4px solid #ffc107;">
            <div style="display: flex; align-items: start; gap: 12px;">
                <i class="fas fa-info-circle" style="color: #856404; font-size: 20px; margin-top: 2px;"></i>
                <div style="color: #856404; line-height: 1.4; font-size: 14px;">${message}</div>
            </div>
        </div>
    `;

    document.body.appendChild(infoDiv);
    setTimeout(() => infoDiv.remove(), 8000);
}

// Show autofill option if user is logged in
function showAutofillOptionIfLoggedIn() {
    try {
        if (!window.safeStorage) {
            console.log('safeStorage not available yet');
            return;
        }

        const currentUser = window.safeStorage.getItem('currentUser');
        const autofillOption = document.getElementById('userInfoAutofillOption');
        const useUserInfoCheckbox = document.getElementById('useUserInfo');

        if (!autofillOption) {
            console.log('Autofill option element not found');
            return;
        }

        if (!currentUser) {
            console.log('No logged in user found');
            // Hide the option if user is not logged in
            autofillOption.style.display = 'none';
            return;
        }

        // Show the autofill checkbox option
        autofillOption.style.display = 'block';

        // Add event listener to the checkbox (only once)
        if (useUserInfoCheckbox && !useUserInfoCheckbox.dataset.listenerAdded) {
            useUserInfoCheckbox.addEventListener('change', async function() {
                if (this.checked) {
                    // User opted in - fill the information
                    await autofillUserInfo();
                } else {
                    // User unchecked - clear and re-enable all fields
                    clearAndEnableAllFields();
                }
            });
            useUserInfoCheckbox.dataset.listenerAdded = 'true';
        }

        console.log('Autofill option is now available for logged-in user');

    } catch (error) {
        console.error('Error showing autofill option:', error);
    }
}

// Auto-fill logged in user information (triggered by checkbox)
async function autofillUserInfo() {
    try {
        console.log('=== 开始自动填充用户信息 ===');

        let currentUser = null;

        // 优先使用 sessionService 获取用户信息
        if (window.sessionService) {
            try {
                currentUser = await window.sessionService.getCurrentUser();
                console.log('从 sessionService 获取的用户:', currentUser ? '存在' : '不存在');
            } catch (error) {
                console.error('获取session用户失败:', error);
            }
        }

        // 如果 sessionService 没有用户，再尝试从 localStorage 获取
        if (!currentUser && window.safeStorage) {
            const storedUser = window.safeStorage.getItem('currentUser');
            console.log('从 localStorage 获取的用户:', storedUser ? '存在' : '不存在');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
            }
        }

        if (!currentUser) {
            console.warn('⚠️ No logged in user found - 用户未登录或数据不存在');
            console.warn('⚠️ 用户信息将不会自动填充，请手动输入');
            return;
        }

        const userData = currentUser;
        console.log('解析后的用户数据:', userData);
        console.log('=== 自動填充用户信息 ===');
        console.log('Found logged in user, filling information:', userData);
        console.log('假名信息:', {
            last_name_katakana: userData.last_name_katakana,
            first_name_katakana: userData.first_name_katakana
        });
        console.log('地址信息:', {
            country: userData.country,
            postal_code: userData.postal_code,
            prefecture: userData.prefecture,
            city: userData.city,
            address_line: userData.address_line
        });

        // Fill booker information (keep fields editable)
        if (userData.last_name) {
            const lastNameField = document.getElementById('lastName');
            if (lastNameField) {
                lastNameField.value = userData.last_name;
            }
        }

        if (userData.first_name) {
            const firstNameField = document.getElementById('firstName');
            if (firstNameField) {
                firstNameField.value = userData.first_name;
            }
        }

        if (userData.last_name_katakana) {
            const lastNameKanaField = document.getElementById('lastNameKana');
            console.log('尝试填充姓假名字段:', lastNameKanaField, '值:', userData.last_name_katakana);
            if (lastNameKanaField) {
                lastNameKanaField.value = userData.last_name_katakana;
                console.log('✓ 姓假名已填充:', lastNameKanaField.value);
            } else {
                console.warn('✗ 姓假名字段未找到 (#lastNameKana)');
            }
        } else {
            console.warn('✗ userData中没有last_name_katakana');
        }

        if (userData.first_name_katakana) {
            const firstNameKanaField = document.getElementById('firstNameKana');
            console.log('尝试填充名假名字段:', firstNameKanaField, '値:', userData.first_name_katakana);
            if (firstNameKanaField) {
                firstNameKanaField.value = userData.first_name_katakana;
                console.log('✓ 名假名已填充:', firstNameKanaField.value);
            } else {
                console.warn('✗ 名假名字段未找到 (#firstNameKana)');
            }
        } else {
            console.warn('✗ userData中没有first_name_katakana');
        }

        if (userData.email) {
            const emailField = document.getElementById('email');
            if (emailField) {
                emailField.value = userData.email;
            }
        }

        if (userData.phone) {
            const phoneField = document.getElementById('phone');
            if (phoneField) {
                phoneField.value = userData.phone;
            }
        }

        // Fill address information if available (keep fields editable)
        console.log('=== 开始填充地址信息 ===');
        if (userData.country) {
            const countryField = document.getElementById('country');
            console.log('尝试填充国家字段:', countryField, '值:', userData.country);
            if (countryField) {
                countryField.value = userData.country;

                // Trigger country change event to show correct address fields
                const event = new Event('change');
                countryField.dispatchEvent(event);
                console.log('✓ 国家已填充并触发change事件:', countryField.value);
            } else {
                console.warn('✗ 国家字段未找到 (#country)');
            }
        } else {
            console.warn('✗ userData中没有country');
        }

        if (userData.postal_code) {
            const postalCodeField = document.getElementById('postalCode');
            if (postalCodeField) {
                postalCodeField.value = userData.postal_code;
                console.log('✓ 邮编已填充:', userData.postal_code);
            }
        }

        console.log('检查都道府县数据:', userData.prefecture);
        if (userData.prefecture) {
            const prefectureField = document.getElementById('prefecture');
            console.log('都道府县字段:', prefectureField);
            if (prefectureField) {
                // Map Japanese prefecture names to English values
                const prefectureMap = {
                    '北海道': 'hokkaido',
                    '青森県': 'aomori',
                    '岩手県': 'iwate',
                    '宮城県': 'miyagi',
                    '秋田県': 'akita',
                    '山形県': 'yamagata',
                    '福島県': 'fukushima',
                    '茨城県': 'ibaraki',
                    '栃木県': 'tochigi',
                    '群馬県': 'gunma',
                    '埼玉県': 'saitama',
                    '千葉県': 'chiba',
                    '東京都': 'tokyo',
                    '神奈川県': 'kanagawa',
                    '新潟県': 'niigata',
                    '富山県': 'toyama',
                    '石川県': 'ishikawa',
                    '福井県': 'fukui',
                    '山梨県': 'yamanashi',
                    '長野県': 'nagano',
                    '岐阜県': 'gifu',
                    '静岡県': 'shizuoka',
                    '愛知県': 'aichi',
                    '三重県': 'mie',
                    '滋賀県': 'shiga',
                    '京都府': 'kyoto',
                    '大阪府': 'osaka',
                    '兵庫県': 'hyogo',
                    '奈良県': 'nara',
                    '和歌山県': 'wakayama',
                    '鳥取県': 'tottori',
                    '島根県': 'shimane',
                    '岡山県': 'okayama',
                    '広島県': 'hiroshima',
                    '山口県': 'yamaguchi',
                    '徳島県': 'tokushima',
                    '香川県': 'kagawa',
                    '愛媛県': 'ehime',
                    '高知県': 'kochi',
                    '福岡県': 'fukuoka',
                    '佐賀県': 'saga',
                    '長崎県': 'nagasaki',
                    '熊本県': 'kumamoto',
                    '大分県': 'oita',
                    '宮崎県': 'miyazaki',
                    '鹿児島県': 'kagoshima',
                    '沖縄県': 'okinawa'
                };

                const englishValue = prefectureMap[userData.prefecture];
                console.log('都道府县映射:', userData.prefecture, '->', englishValue);
                if (englishValue) {
                    prefectureField.value = englishValue;
                    console.log('✓ 都道府县已填充:', englishValue);
                } else {
                    // If not found in map, try setting directly (might already be English value)
                    prefectureField.value = userData.prefecture;
                    console.log('✓ 都道府县直接设置:', userData.prefecture);
                }
            }
        } else {
            console.warn('✗ userData中没有prefecture');
        }

        if (userData.city) {
            const cityField = document.getElementById('city');
            if (cityField) {
                cityField.value = userData.city;
            }
        }

        if (userData.address_line) {
            const addressField = document.getElementById('address');
            if (addressField) {
                addressField.value = userData.address_line;
            }
        }

        // Fill international address if available (keep fields editable)
        if (userData.state_province) {
            const stateField = document.getElementById('stateProvince');
            if (stateField) {
                stateField.value = userData.state_province;
            }
        }

        if (userData.city_district) {
            const cityDistrictField = document.getElementById('cityDistrict');
            if (cityDistrictField) {
                cityDistrictField.value = userData.city_district;
            }
        }

        if (userData.street_address) {
            const streetAddressField = document.getElementById('streetAddress');
            if (streetAddressField) {
                streetAddressField.value = userData.street_address;
            }
        }

        // Set country code if available (keep field editable)
        if (userData.phone_country_code) {
            const countryCodeField = document.getElementById('countryCode');
            if (countryCodeField) {
                countryCodeField.value = userData.phone_country_code;
            }
        }

        // Set foreigner checkbox based on database value
        const isForeignerCheckbox = document.getElementById('isForeigner');
        if (isForeignerCheckbox) {
            // Use is_foreigner field from database
            const isForeigner = userData.is_foreigner === 1 || userData.is_foreigner === true;
            console.log('✓ Setting foreigner checkbox from database:', isForeigner);
            isForeignerCheckbox.checked = isForeigner;
            // Trigger the change event to show/hide katakana fields
            const event = new Event('change');
            isForeignerCheckbox.dispatchEvent(event);
        }

        console.log('User information filled successfully (fields remain editable)');

    } catch (error) {
        console.error('Error auto-filling user information:', error);
    }
}

// Clear and re-enable all user information fields
function clearAndEnableAllFields() {
    try {
        console.log('=== Clearing all user information fields ===');

        // List of all field IDs to clear
        const fieldIds = [
            'lastName', 'firstName', 'lastNameKana', 'firstNameKana',
            'email', 'phone', 'countryCode', 'country',
            'postalCode', 'prefecture', 'city', 'address',
            'stateProvince', 'cityDistrict', 'streetAddress'
        ];

        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Clear the value
                field.value = '';

                // Reset any styling
                field.style.backgroundColor = '';
                field.style.cursor = '';
                field.style.borderColor = '';

                // Remove any readonly/disabled attributes
                field.removeAttribute('readonly');
                field.removeAttribute('disabled');
            }
        });

        // Reset country to default (Japan)
        const countryField = document.getElementById('country');
        if (countryField) {
            countryField.value = 'japan';
            // Trigger change event to show Japan address fields
            const event = new Event('change');
            countryField.dispatchEvent(event);
        }

        console.log('All fields cleared and re-enabled successfully');

    } catch (error) {
        console.error('Error clearing user information fields:', error);
    }
}

// Get default date (today + offset days)
function getDefaultDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
}

// Format date in Japanese
function formatDateJapanese(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];

    return `${year}年${month}月${day}日（${weekday}）`;
}

// Calculate nights between dates
function calculateNights(checkin, checkout) {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const timeDiff = checkoutDate - checkinDate;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// Room type mapping
const ROOM_TYPES = {
    'twin': { name: 'ツインルーム', capacity: 2 },
    'double': { name: 'ダブルルーム', capacity: 2 },
    'triple': { name: 'トリプルルーム', capacity: 3 },
    'twin_japanese': { name: '和洋室', capacity: 2 },
    'family': { name: 'ファミリールーム（和室）', capacity: 5 }
};

// Update reservation info display
function updateReservationDisplay(checkin, checkout, adults, children, code, rooms = '1') {
    const checkinElement = document.getElementById('checkinDate');
    const checkoutElement = document.getElementById('checkoutDate');
    const nightsElement = document.getElementById('nightsCount');
    const roomTypeElement = document.getElementById('roomType');
    const guestCountElement = document.getElementById('guestCount');

    if (checkinElement) checkinElement.textContent = formatDateJapanese(checkin);
    if (checkoutElement) checkoutElement.textContent = formatDateJapanese(checkout);

    const nights = calculateNights(checkin, checkout);
    if (nightsElement) nightsElement.textContent = `${nights}泊`;

    // Get room type name from code
    const roomInfo = ROOM_TYPES[code] || { name: decodeURIComponent(code), capacity: 2 };
    if (roomTypeElement) {
        // Show room type with quantity if more than 1 room
        const roomText = parseInt(rooms) > 1 ? `${roomInfo.name} × ${rooms}室` : roomInfo.name;
        roomTypeElement.textContent = roomText;
    }

    // Calculate total guests
    const totalAdults = parseInt(adults) || 0;
    const totalChildren = parseInt(children) || 0;
    const totalGuests = totalAdults + totalChildren;

    // Build guest count text
    let guestText = '';
    if (parseInt(rooms) > 1) {
        // Multiple rooms: show total guests per room
        guestText = `合計${totalGuests}名（${rooms}室）`;
    } else {
        // Single room: show adults and children separately
        guestText = `大人${adults}名`;
        if (children && children !== '0') {
            guestText += ` 子供${children}名`;
        }
    }
    if (guestCountElement) guestCountElement.textContent = guestText;

    // Update total price
    updateTotalPrice();
}

// Setup event listeners
function setupEventListeners() {
    // Service checkboxes
    const serviceCheckboxes = document.querySelectorAll('input[type="checkbox"][name]');
    serviceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateServicesAndPrice);
    });

    // Postal code auto-completion
    const postalCodeInput = document.getElementById('postalCode');
    if (postalCodeInput) {
        postalCodeInput.addEventListener('input', handlePostalCodeInput);
        postalCodeInput.addEventListener('blur', lookupPostalCode);
    }

    // Same as booker checkbox
    const sameAsBookerCheckbox = document.getElementById('sameAsBooker');
    if (sameAsBookerCheckbox) {
        sameAsBookerCheckbox.addEventListener('change', handleSameAsBooker);
    }

    // Payment method selection - Removed as online payment is now mandatory

    // Payment method buttons
    const paymentButtons = document.querySelectorAll('.payment-btn');
    paymentButtons.forEach(button => {
        button.addEventListener('click', handlePaymentButtonClick);
    });

    // Points input - Real-time calculation
    const pointsInput = document.getElementById('pointsToUse');
    if (pointsInput) {
        pointsInput.addEventListener('input', calculatePointsDiscount);
        pointsInput.addEventListener('change', calculatePointsDiscount);
    }

    // Credit card input formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', formatCardNumber);
    }

    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', formatCardExpiry);
    }

    // Form submission
    const confirmationForm = document.getElementById('confirmationForm');
    if (confirmationForm) {
        confirmationForm.addEventListener('submit', handleFormSubmission);
    }
}

// Navigation functions
async function nextStep() {
    if (currentStep < maxSteps) {
        if (validateCurrentStep()) {
            // 选择当前步骤中的"次へ"按钮
            const currentStepElement = document.getElementById(`step${currentStep}`);
            const nextBtn = currentStepElement ? currentStepElement.querySelector('.btn-next') : null;
            const originalHTML = nextBtn ? nextBtn.innerHTML : '';

            // 显示加载动画（转圈圈）
            function showLoading() {
                if (nextBtn) {
                    nextBtn.disabled = true;
                    nextBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size: 18px;"></i>';
                    nextBtn.style.opacity = '0.8';
                    nextBtn.style.cursor = 'not-allowed';
                    nextBtn.style.pointerEvents = 'none';
                }
            }

            // 恢复按钮
            function hideLoading() {
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.innerHTML = originalHTML;
                    nextBtn.style.opacity = '1';
                    nextBtn.style.cursor = 'pointer';
                    nextBtn.style.pointerEvents = 'auto';
                }
            }

            // Step 1 (予約内容): Save to temp order, then move to step 2 (確認)
            if (currentStep === 1) {
                console.log('📋 Step 1: Preparing to save order data...');
                showLoading();

                try {
                    // 1. 收集表单数据并保存到 orders_tmp
                    if (window.OrderTemp && typeof window.OrderTemp.save === 'function') {
                        console.log('💾 Step 1: Collecting form data and saving to orders_tmp...');
                        await window.OrderTemp.save();
                        console.log('✅ Step 1: Order saved to orders_tmp successfully');
                    }

                    // 2. 进入第二步
                    console.log('➡️ Step 1: Moving to Step 2...');
                    await moveToStep(2);

                    // 3. 恢复按钮（在步骤切换完成后）
                    hideLoading();

                } catch (error) {
                    console.error('❌ Step 1: Failed to save order:', error);
                    hideLoading();
                    alert('保存に失敗しました。もう一度お試しください。\n\nエラー: ' + error.message);
                    return;
                }
            }
            // Step 2 (確認): Save to temp order, initialize Express Checkout, then move to step 3 (支払い・決済)
            else if (currentStep === 2) {
                console.log('💾 Step 2 → Step 3: Saving order to orders_tmp...');
                showLoading();

                try {
                    // 保存订单信息到临时订单表
                    if (window.OrderTemp && typeof window.OrderTemp.save === 'function') {
                        await window.OrderTemp.save();
                        console.log('✅ Order saved to orders_tmp successfully');
                    }

                    // 初始化 Express Checkout Element 并等待加载完成
                    console.log('📦 Step 2: Initializing Express Checkout Element...');
                    if (window.initializeExpressCheckoutElement) {
                        await window.initializeExpressCheckoutElement();
                        console.log('✅ Express Checkout Element initialized');
                    }

                    // 进入第三步
                    await moveToStep(3);

                    // 恢复按钮
                    hideLoading();

                } catch (error) {
                    console.error('❌ Failed to save order:', error);
                    hideLoading();
                    alert('保存に失敗しました。もう一度お試しください。');
                    return;
                }
            }
            // Step 3 (支払い・決済): Payment step - create order before moving to completion
            else if (currentStep === 3) {
                await handlePaymentAndCreateOrder();
            }
            // Other steps: just move to next step
            else {
                moveToStep(currentStep + 1);
            }
        }
    }
}

async function prevStep() {
    if (currentStep > 1) {
        const prevBtn = document.querySelector('.prev-btn');
        const originalHTML = prevBtn ? prevBtn.innerHTML : '';

        // 显示加载动画
        if (prevBtn) {
            prevBtn.disabled = true;
            prevBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            prevBtn.style.opacity = '0.7';
        }

        console.log(`⬅️ Step ${currentStep}: Going back to Step ${currentStep - 1}...`);

        try {
            // 从数据库读取最新数据
            if (window.OrderTemp && typeof window.OrderTemp.load === 'function') {
                console.log(`📥 Step ${currentStep}: Loading latest data from orders_tmp...`);
                await window.OrderTemp.load();
                console.log(`✅ Step ${currentStep}: Data loaded from database`);
            }

            // 切换到上一步
            await moveToStep(currentStep - 1);

            console.log(`✅ Returned to Step ${currentStep} with database data`);
        } finally {
            // 恢复按钮
            if (prevBtn) {
                prevBtn.disabled = false;
                prevBtn.innerHTML = originalHTML;
                prevBtn.style.opacity = '1';
            }
        }
    }
}

async function moveToStep(step) {
    // Hide current step
    const currentStepElement = document.getElementById(`step${currentStep}`);
    if (currentStepElement) {
        currentStepElement.classList.remove('active');
    }

    // Store old step for comparison
    const oldStep = currentStep;

    // Show new step
    currentStep = step;
    const newStepElement = document.getElementById(`step${currentStep}`);
    if (newStepElement) {
        newStepElement.classList.add('active');
    }

    // Update all step indicators
    for (let i = 1; i <= maxSteps; i++) {
        const stepIndicator = document.querySelector(`.step[data-step="${i}"]`);
        if (stepIndicator) {
            // Remove all status classes
            stepIndicator.classList.remove('active', 'completed');

            if (i === currentStep) {
                // Current step is active
                stepIndicator.classList.add('active');
            } else if (i < currentStep) {
                // Previous steps are completed
                stepIndicator.classList.add('completed');
            }
            // Future steps remain without any special class
        }
    }

    // Update confirmation summary if on step 2 (確認)
    if (currentStep === 2) {
        console.log('📥 Step 2: Loading data from database for confirmation...');
        // 从数据库读取最新数据并更新确认页面
        await updateConfirmationSummaryFromDatabase();
        // 加载用户积分信息
        await loadUserPoints();
    }

    // Handle payment processing on step 3 (支払い・決済)
    if (currentStep === 3) {
        // Payment method selection - no automatic processing yet
        // User will select payment method and then click submit

        // Express Checkout Element は Step 2 の「次へ」ボタンクリック時に初期化済み
        // 戻るボタンで Step 3 に再度入った場合のみ再初期化する
        if (oldStep < 3) {
            console.log('=== Step 3: Express Checkout Element は既に初期化済み ===');
        } else {
            // 戻るボタンで Step 3 に戻った場合（Step 4 から戻る等）
            console.log('=== Step 3: Express Checkout Element を再初期化 ===');
            if (window.initializeExpressCheckoutElement) {
                await window.initializeExpressCheckoutElement();
            }
        }
    }

    // Handle booking completion on step 4 (完了)
    if (currentStep === 4) {
        await handleBookingCompletion();
    }

    // Scroll to step indicator for better user experience
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        stepIndicator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Validate current step
function validateCurrentStep() {
    // Special validation for step 1 (katakana and address)
    if (currentStep === 1) {
        // Email verification is optional - user can proceed without verifying

        // Validate katakana fields only if not a foreigner
        const isForeigner = document.getElementById('isForeigner')?.checked;

        if (!isForeigner) {
            const lastNameKana = document.getElementById('lastNameKana');
            const firstNameKana = document.getElementById('firstNameKana');

            if (!isValidKatakana(lastNameKana.value)) {
                validateKatakana(lastNameKana);
                showKatakanaError('lastNameKana', 'lastNameKanaError', '全角カタカナで入力してください（例：ヤマダ）');
                lastNameKana.focus();
                return false;
            } else {
                clearKatakanaError('lastNameKana', 'lastNameKanaError');
            }

            if (!isValidKatakana(firstNameKana.value)) {
                validateKatakana(firstNameKana);
                showKatakanaError('firstNameKana', 'firstNameKanaError', '全角カタカナで入力してください（例：タロウ）');
                firstNameKana.focus();
                return false;
            } else {
                clearKatakanaError('firstNameKana', 'firstNameKanaError');
            }
        }

        // Validate address fields based on country selection
        const country = document.getElementById('country')?.value;
        if (country === 'japan') {
            // Validate Japan address fields
            const postalCode = document.getElementById('postalCode')?.value;
            const prefecture = document.getElementById('prefecture')?.value;
            const address = document.getElementById('address')?.value;

            if (!postalCode || !prefecture || !address) {
                alert('日本の住所情報を入力してください。');
                return false;
            }
        } else {
            // Validate international address fields
            const stateProvince = document.getElementById('stateProvince')?.value;
            const cityDistrict = document.getElementById('cityDistrict')?.value;
            const streetAddress = document.getElementById('streetAddress')?.value;

            if (!stateProvince || !cityDistrict || !streetAddress) {
                alert('住所情報を入力してください / Please enter address information.');
                return false;
            }
        }
    }

    // Step 2 (確認) - no special validation needed, just confirmation display

    // Special validation for step 3 (payment method)
    if (currentStep === 3) {
        return validatePaymentStep();
    }

    const currentForm = document.querySelector(`#step${currentStep} form`);
    if (!currentForm) return true;

    const requiredFields = currentForm.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            field.style.borderColor = '#e9ecef';
        }
    });

    if (!isValid) {
        alert('必須項目をすべて入力してください。');
    }

    return isValid;
}

// Validate payment step
function validatePaymentStep() {
    // Payment method is always 'online' now - only validate that a payment type is selected
    const selectedPaymentType = window.selectedOnlinePaymentType;

    if (!selectedPaymentType) {
        alert('オンライン決済方法を選択してください。');
        // Highlight the payment buttons area
        const paymentButtons = document.querySelector('.payment-method-buttons');
        if (paymentButtons) {
            paymentButtons.style.border = '2px solid #dc3545';
            paymentButtons.style.borderRadius = '8px';
            paymentButtons.style.padding = '14px';

            // Remove highlight after 3 seconds
            setTimeout(() => {
                paymentButtons.style.border = '';
                paymentButtons.style.borderRadius = '';
                paymentButtons.style.padding = '';
            }, 3000);
        }
        return false;
    }

    // If credit card is selected, validate credit card fields
    if (selectedPaymentType === 'creditcard') {
        const cardNumber = document.getElementById('cardNumber')?.value?.trim();
        const cardName = document.getElementById('cardName')?.value?.trim();
        const cardExpiry = document.getElementById('cardExpiry')?.value?.trim();
        const cardCVC = document.getElementById('cardCVC')?.value?.trim();

        if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
            alert('クレジットカード情報をすべて入力してください。');

            // Highlight empty fields
            if (!cardNumber) document.getElementById('cardNumber').style.borderColor = '#dc3545';
            if (!cardName) document.getElementById('cardName').style.borderColor = '#dc3545';
            if (!cardExpiry) document.getElementById('cardExpiry').style.borderColor = '#dc3545';
            if (!cardCVC) document.getElementById('cardCVC').style.borderColor = '#dc3545';

            return false;
        }
    }

    return true;
}

// Update confirmation summary
/**
 * 从数据库读取数据并更新确认页面
 * 确保显示的是数据库中的最新数据
 */
async function updateConfirmationSummaryFromDatabase() {
    console.log('📥 Loading confirmation data from database...');

    // 获取临时订单编号
    const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
        ? window.OrderTemp.getTempOrderCode()
        : window.currentTempOrderCode;

    if (!tempOrderCode) {
        console.warn('⚠️ No temp order code, falling back to form data');
        updateConfirmationSummary(); // 后备方案：从表单读取
        return;
    }

    try {
        // 从数据库读取订单数据
        const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}`), {
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success && result.data) {
            const orderData = result.data;
            console.log('✅ Got order data from database for confirmation:', orderData);

            // 更新预订详情（从数据库）
            console.log('📋 Updating reservation details from database...');
            console.log('📋 Reservation data:', {
                checkin_date: orderData.checkin_date,
                checkout_date: orderData.checkout_date,
                num_nights: orderData.num_nights,
                room_type_name: orderData.room_type_name,
                num_adults: orderData.num_adults,
                num_children: orderData.num_children
            });

            const confirmCheckin = document.getElementById('confirmCheckin');
            const confirmCheckout = document.getElementById('confirmCheckout');
            const confirmNights = document.getElementById('confirmNights');
            const confirmRoomType = document.getElementById('confirmRoomType');
            const confirmGuests = document.getElementById('confirmGuests');

            if (confirmCheckin) {
                const checkinText = formatDateJapanese(orderData.checkin_date);
                confirmCheckin.textContent = checkinText;
                console.log('✅ Check-in date set to:', checkinText);
            }
            if (confirmCheckout) {
                const checkoutText = formatDateJapanese(orderData.checkout_date);
                confirmCheckout.textContent = checkoutText;
                console.log('✅ Check-out date set to:', checkoutText);
            }
            if (confirmNights) {
                const nightsText = `${orderData.num_nights}泊`;
                confirmNights.textContent = nightsText;
                console.log('✅ Nights set to:', nightsText);
            }

            // 房型名称（从数据库读取，如果没有则从 URL 读取）
            if (confirmRoomType) {
                let roomTypeName = orderData.room_type_name;
                if (!roomTypeName) {
                    // 后备方案：从 URL 读取
                    const urlParams = new URLSearchParams(window.location.search);
                    roomTypeName = decodeURIComponent(urlParams.get('plan') || 'ツインルーム【セミダブルベッド】');
                    console.log('⚠️ Room type name not in database, using URL:', roomTypeName);
                }
                confirmRoomType.textContent = roomTypeName;
                console.log('✅ Room type set to:', roomTypeName);
            }

            // 客人信息（从数据库）
            const adults = orderData.num_adults || 2;
            const children = orderData.num_children || 0;
            let guestText = `大人${adults}名`;
            if (children > 0) {
                guestText += ` 子供${children}名`;
            }
            if (confirmGuests) {
                confirmGuests.textContent = guestText;
                console.log('✅ Guests set to:', guestText);
            }

            // 预订者信息（从数据库）
            const confirmName = document.getElementById('confirmName');
            const confirmNameKana = document.getElementById('confirmNameKana');
            const confirmEmail = document.getElementById('confirmEmail');
            const confirmPhone = document.getElementById('confirmPhone');
            const confirmCountry = document.getElementById('confirmCountry');

            if (confirmName) {
                confirmName.textContent = `${orderData.guest_last_name || ''} ${orderData.guest_first_name || ''}`;
            }
            if (confirmEmail) {
                confirmEmail.textContent = orderData.guest_email || '';
            }
            if (confirmPhone) {
                const phoneCode = orderData.phone_country_code || '+81';
                const phone = orderData.guest_phone || '';
                confirmPhone.textContent = `${phoneCode} ${phone}`;
            }

            // 片假名
            if (confirmNameKana && orderData.guest_last_name_katakana) {
                confirmNameKana.textContent = `${orderData.guest_last_name_katakana} ${orderData.guest_first_name_katakana || ''}`;
                const confirmNameKanaRow = document.getElementById('confirmNameKanaRow');
                if (confirmNameKanaRow) confirmNameKanaRow.style.display = '';
            }

            // 地址信息
            console.log('🏠 Address data from database:', {
                country: orderData.country,
                postal_code: orderData.postal_code,
                prefecture: orderData.prefecture,
                city: orderData.city,
                address_line: orderData.address_line
            });

            // 显示国家
            if (confirmCountry) {
                const countrySelect = document.getElementById('country');
                if (countrySelect && orderData.country) {
                    const option = Array.from(countrySelect.options).find(opt =>
                        opt.value === orderData.country
                    );
                    const countryText = option ? option.text : orderData.country;
                    confirmCountry.textContent = countryText;
                    console.log('✅ Country set to:', countryText);
                }
            }

            // 显示住所（根据国家选择日本格式或国际格式）
            const isJapan = orderData.country === 'japan' || orderData.country === '日本';
            const confirmJapanAddressRow = document.getElementById('confirmJapanAddressRow');
            const confirmInternationalAddressRow = document.getElementById('confirmInternationalAddressRow');
            const confirmJapanAddress = document.getElementById('confirmJapanAddress');
            const confirmInternationalAddress = document.getElementById('confirmInternationalAddress');

            if (isJapan) {
                // 日本地址格式：〒邮编 都道府县 市区町村 番地
                if (confirmJapanAddressRow) confirmJapanAddressRow.style.display = '';
                if (confirmInternationalAddressRow) confirmInternationalAddressRow.style.display = 'none';

                if (confirmJapanAddress) {
                    const addressParts = [];
                    if (orderData.postal_code) addressParts.push(`〒${orderData.postal_code}`);
                    if (orderData.prefecture) addressParts.push(orderData.prefecture);
                    if (orderData.city) addressParts.push(orderData.city);
                    if (orderData.address_line) addressParts.push(orderData.address_line);
                    const fullAddress = addressParts.join(' ');
                    confirmJapanAddress.textContent = fullAddress || '-';
                    console.log('✅ Japan address set to:', fullAddress);
                }
            } else {
                // 国际地址格式
                if (confirmJapanAddressRow) confirmJapanAddressRow.style.display = 'none';
                if (confirmInternationalAddressRow) confirmInternationalAddressRow.style.display = '';

                if (confirmInternationalAddress) {
                    const addressParts = [];
                    if (orderData.address_line) addressParts.push(orderData.address_line);
                    if (orderData.city) addressParts.push(orderData.city);
                    if (orderData.prefecture) addressParts.push(orderData.prefecture);
                    if (orderData.postal_code) addressParts.push(orderData.postal_code);
                    const fullAddress = addressParts.join(', ');
                    confirmInternationalAddress.textContent = fullAddress || '-';
                    console.log('✅ International address set to:', fullAddress);
                }
            }

            // 特别要求
            const confirmSpecialRequests = document.getElementById('confirmSpecialRequests');
            if (confirmSpecialRequests) {
                confirmSpecialRequests.textContent = orderData.special_requests || 'なし';
            }

            // 价格信息（从数据库）
            updatePriceSummaryFromDatabase(orderData);

            console.log('✅ Confirmation page updated with database data');
        } else {
            console.warn('⚠️ Failed to load order data, falling back to form data');
            updateConfirmationSummary(); // 后备方案
        }
    } catch (error) {
        console.error('❌ Error loading confirmation data:', error);
        updateConfirmationSummary(); // 后备方案
    }
}

/**
 * 更新价格摘要（从数据库数据）
 */
function updatePriceSummaryFromDatabase(orderData) {
    console.log('💰 Updating price summary from database...');
    console.log('💰 Order data total_price:', orderData.total_price);
    console.log('💰 Order data room_price:', orderData.room_price);
    console.log('💰 Order data service_cost:', orderData.service_cost);

    // 保存订单数据到全局变量，供积分计算使用
    window.currentTempOrderData = orderData;
    currentOrderTotal = parseInt(orderData.total_price) || 0;
    console.log('💰 Set currentOrderTotal to:', currentOrderTotal);

    // 更新右侧预订信息卡的价格显示（如果存在）
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement && orderData.total_price) {
        const formattedPrice = `¥${parseFloat(orderData.total_price).toLocaleString()}`;
        totalPriceElement.textContent = formattedPrice;
        console.log('✅ Right panel price updated to:', formattedPrice);
    }

    console.log('✅ Price summary updated from database');
}

/**
 * 原有的更新确认页面函数（从表单字段读取）
 * 作为后备方案保留
 */
function updateConfirmationSummary() {
    // Get URL parameters for booking details
    const urlParams = new URLSearchParams(window.location.search);

    // Update booking details
    const confirmCheckin = document.getElementById('confirmCheckin');
    const confirmCheckout = document.getElementById('confirmCheckout');
    const confirmNights = document.getElementById('confirmNights');
    const confirmRoomType = document.getElementById('confirmRoomType');
    const confirmGuests = document.getElementById('confirmGuests');

    if (confirmCheckin) confirmCheckin.textContent = formatDateJapanese(urlParams.get('checkin') || getDefaultDate());
    if (confirmCheckout) confirmCheckout.textContent = formatDateJapanese(urlParams.get('checkout') || getDefaultDate(1));

    const nights = calculateNights(urlParams.get('checkin') || getDefaultDate(), urlParams.get('checkout') || getDefaultDate(1));
    if (confirmNights) confirmNights.textContent = `${nights}泊`;

    if (confirmRoomType) confirmRoomType.textContent = decodeURIComponent(urlParams.get('plan') || 'ツインルーム【セミダブルベッド】');

    const adults = urlParams.get('adults') || '2';
    const children = urlParams.get('children') || '0';
    let guestText = `大人${adults}名`;
    if (children && children !== '0') {
        guestText += ` 子供${children}名`;
    }
    if (confirmGuests) confirmGuests.textContent = guestText;

    // Booker info
    const bookerLastName = document.getElementById('lastName')?.value || '';
    const bookerFirstName = document.getElementById('firstName')?.value || '';
    const bookerLastNameKana = document.getElementById('lastNameKana')?.value || '';
    const bookerFirstNameKana = document.getElementById('firstNameKana')?.value || '';
    const bookerEmail = document.getElementById('email')?.value || '';
    const countryCode = document.getElementById('countryCode')?.value || '+81';
    const bookerPhone = document.getElementById('phone')?.value || '';
    const country = document.getElementById('country')?.value || '';

    const confirmName = document.getElementById('confirmName');
    const confirmNameKana = document.getElementById('confirmNameKana');
    const confirmNameKanaRow = document.getElementById('confirmNameKanaRow');
    const confirmEmail = document.getElementById('confirmEmail');
    const confirmPhone = document.getElementById('confirmPhone');
    const confirmCountry = document.getElementById('confirmCountry');

    if (confirmName) confirmName.textContent = `${bookerLastName} ${bookerFirstName}`;
    if (confirmEmail) confirmEmail.textContent = bookerEmail;
    if (confirmPhone) confirmPhone.textContent = `${countryCode} ${bookerPhone}`;

    // Show katakana if not a foreigner
    const isForeigner = document.getElementById('isForeigner')?.checked;
    if (!isForeigner && (bookerLastNameKana || bookerFirstNameKana)) {
        if (confirmNameKanaRow) confirmNameKanaRow.style.display = 'flex';
        if (confirmNameKana) confirmNameKana.textContent = `${bookerLastNameKana} ${bookerFirstNameKana}`;
    } else {
        if (confirmNameKanaRow) confirmNameKanaRow.style.display = 'none';
    }

    // Show country
    const countryNames = {
        'japan': '日本',
        'china': '中国',
        'usa': 'アメリカ',
        'korea': '韓国',
        'taiwan': '台湾',
        'hongkong': '香港',
        'singapore': 'シンガポール',
        'thailand': 'タイ',
        'vietnam': 'ベトナム',
        'philippines': 'フィリピン',
        'malaysia': 'マレーシア',
        'indonesia': 'インドネシア',
        'india': 'インド',
        'australia': 'オーストラリア',
        'uk': 'イギリス',
        'france': 'フランス',
        'germany': 'ドイツ',
        'italy': 'イタリア',
        'spain': 'スペイン',
        'canada': 'カナダ',
        'russia': 'ロシア',
        'brazil': 'ブラジル',
        'mexico': 'メキシコ',
        'other': 'その他'
    };
    if (confirmCountry) confirmCountry.textContent = countryNames[country] || country;

    // Show address based on country
    const confirmJapanAddressRow = document.getElementById('confirmJapanAddressRow');
    const confirmInternationalAddressRow = document.getElementById('confirmInternationalAddressRow');
    const confirmJapanAddress = document.getElementById('confirmJapanAddress');
    const confirmInternationalAddress = document.getElementById('confirmInternationalAddress');

    if (country === 'japan') {
        const postalCode = document.getElementById('postalCode')?.value || '';
        const prefecture = document.getElementById('prefecture')?.selectedOptions[0]?.text || '';
        const address = document.getElementById('address')?.value || '';

        if (confirmJapanAddressRow) confirmJapanAddressRow.style.display = 'flex';
        if (confirmInternationalAddressRow) confirmInternationalAddressRow.style.display = 'none';
        if (confirmJapanAddress) {
            confirmJapanAddress.textContent = `〒${postalCode} ${prefecture}${address}`;
        }
    } else {
        const stateProvince = document.getElementById('stateProvince')?.value || '';
        const cityDistrict = document.getElementById('cityDistrict')?.value || '';
        const streetAddress = document.getElementById('streetAddress')?.value || '';
        const internationalPostalCode = document.getElementById('internationalPostalCode')?.value || '';

        if (confirmJapanAddressRow) confirmJapanAddressRow.style.display = 'none';
        if (confirmInternationalAddressRow) confirmInternationalAddressRow.style.display = 'flex';
        if (confirmInternationalAddress) {
            let addressParts = [streetAddress, cityDistrict, stateProvince];
            if (internationalPostalCode) addressParts.push(internationalPostalCode);
            confirmInternationalAddress.textContent = addressParts.filter(p => p).join(', ');
        }
    }

    // Guest info
    const sameAsBooker = document.getElementById('sameAsBooker')?.checked;
    let guestLastName, guestFirstName, guestEmail, guestPhone;

    if (sameAsBooker) {
        // Use booker information
        guestLastName = bookerLastName;
        guestFirstName = bookerFirstName;
        guestEmail = bookerEmail;
        guestPhone = bookerPhone;
    } else {
        // Use separate guest information
        guestLastName = document.getElementById('guestLastName')?.value || '';
        guestFirstName = document.getElementById('guestFirstName')?.value || '';
        guestEmail = document.getElementById('guestEmail')?.value || '';
        guestPhone = document.getElementById('guestPhone')?.value || '';
    }

    const confirmGuestName = document.getElementById('confirmGuestName');
    const confirmGuestEmail = document.getElementById('confirmGuestEmail');
    const confirmGuestPhone = document.getElementById('confirmGuestPhone');

    if (confirmGuestName) confirmGuestName.textContent = `${guestLastName} ${guestFirstName}`;
    if (confirmGuestEmail) confirmGuestEmail.textContent = guestEmail;
    if (confirmGuestPhone) confirmGuestPhone.textContent = sameAsBooker ? `${countryCode} ${guestPhone}` : guestPhone;

    // Update services summary
    updateServicesConfirmation();

    // Update payment method and total
    updatePaymentConfirmation();
}

function updateServicesConfirmation() {
    const servicesSummarySection = document.getElementById('servicesSummarySection');
    const selectedServicesList = document.getElementById('selectedServicesList');

    const selectedServices = [];
    if (document.getElementById('breakfast')?.checked) {
        selectedServices.push({ name: '朝食バイキング', price: 2000 });
    }
    if (document.getElementById('dinner')?.checked) {
        selectedServices.push({ name: '夕食コース', price: 4500 });
    }
    if (document.getElementById('privateBath')?.checked) {
        selectedServices.push({ name: '貸切風呂', price: 3000 });
    }

    if (selectedServices.length > 0) {
        servicesSummarySection.style.display = 'block';
        selectedServicesList.innerHTML = '';

        selectedServices.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'summary-item';
            serviceItem.innerHTML = `
                <span class="summary-label">${service.name}</span>
                <span class="summary-value">+¥${service.price.toLocaleString()}</span>
            `;
            selectedServicesList.appendChild(serviceItem);
        });
    } else {
        servicesSummarySection.style.display = 'none';
    }
}

async function updatePaymentConfirmation() {
    const confirmPaymentMethod = document.getElementById('confirmPaymentMethod');
    const confirmTotalAmount = document.getElementById('confirmTotalAmount');
    const confirmButton = document.getElementById('confirmButton');

    // Payment method is always 'online' now
    let paymentText = '';
    let buttonText = '';
    const onlinePaymentType = window.selectedOnlinePaymentType || '';
    const paymentMethods = {
        'wechat': 'WeChat Pay',
        'stripe': 'クレジットカード'
    };
    paymentText = `オンライン決済 (${paymentMethods[onlinePaymentType] || ''})`;
    buttonText = `${paymentMethods[onlinePaymentType] || 'オンライン決済'}で支払う`;

    if (confirmPaymentMethod) confirmPaymentMethod.textContent = paymentText;
    if (confirmButton) confirmButton.textContent = buttonText;

    // 优先使用服务器计算的 final_amount（扣除积分后的金额）
    let total;

    if (window.currentTempOrderData && window.currentTempOrderData.final_amount !== null && window.currentTempOrderData.final_amount !== undefined) {
        // 使用 final_amount（已扣除积分）
        total = Math.round(parseFloat(window.currentTempOrderData.final_amount));
        console.log('💰 支付金额使用 final_amount:', total, '(原始金额:', window.currentTempOrderData.total_price, '使用积分:', window.currentTempOrderData.points_used || 0, ')');
    } else if (window.currentTempOrderData && window.currentTempOrderData.total_price) {
        // 使用 total_price
        total = Math.round(parseFloat(window.currentTempOrderData.total_price));
        console.log('💰 支付金额使用 total_price:', total);
    } else {
        // 后备方案：客户端计算（用于兼容旧代码）
        console.log('⚠️ 订单数据不存在，使用客户端计算');

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code') || urlParams.get('plan') || 'twin';
        const rooms = parseInt(urlParams.get('rooms') || '1');
        const adults = parseInt(urlParams.get('adults') || '2');
        const checkin = urlParams.get('checkin') || '';
        const checkout = urlParams.get('checkout') || '';

        // Calculate nights
        let nights = 1;
        if (checkin && checkout) {
            const checkinDate = new Date(checkin);
            const checkoutDate = new Date(checkout);
            const timeDiff = checkoutDate - checkinDate;
            nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) || 1;
        }

        // Get room price from cache or database
        let basePricePerNight = 0; // 不使用默认价格，必须从数据库获取
        try {
            if (roomDataCache[code]) {
                basePricePerNight = roomDataCache[code].price;
            } else {
                const apiUrl = window.getApiUrl(`/rooms/${code}`);
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data && result.data.price_with_tax) {
                        basePricePerNight = parseFloat(result.data.price_with_tax);
                        roomDataCache[code] = {
                            price: basePricePerNight,
                            name: result.data.room_type_name || ''
                        };
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching room price for confirmation:', error);
        }

        // Calculate total room price (rooms × nights × price)
        const totalRoomPrice = basePricePerNight * rooms * nights;

        // 服务费用（已含税）
        let serviceCostPerPerson = 0;
        if (document.getElementById('breakfast')?.checked) serviceCostPerPerson += 2200; // 含税
        if (document.getElementById('dinner')?.checked) serviceCostPerPerson += 4950; // 含税

        const totalServiceCost = (serviceCostPerPerson * adults * nights) +
                               (document.getElementById('privateBath')?.checked ? 3300 : 0); // 含税

        total = Math.round(totalRoomPrice + totalServiceCost);
    }

    if (confirmTotalAmount) confirmTotalAmount.innerHTML = `¥${total.toLocaleString()}<span class="tax-included-text">税込</span>`;
}

// Handle payment and create order (New flow for Step 4)
async function handlePaymentAndCreateOrder() {
    const paymentSubmitBtn = document.getElementById('paymentSubmitBtn');

    // Disable button to prevent double submission
    if (paymentSubmitBtn) {
        paymentSubmitBtn.disabled = true;
        paymentSubmitBtn.textContent = '処理中...';
    }

    try {
        // Call API to create order
        console.log('Creating order via API...');
        await window.submitFinalBooking();

        console.log('Order created successfully, order code:', window.bookingOrderCode);

        // Move to step 5 (completion)
        moveToStep(5);

    } catch (error) {
        console.error('Order creation failed:', error);
        alert('予約処理に失敗しました。もう一度お試しください。\n\nエラー: ' + (error.message || '不明なエラー'));

        // Re-enable button
        if (paymentSubmitBtn) {
            paymentSubmitBtn.disabled = false;
            paymentSubmitBtn.textContent = '決済する';
        }
    }
}

// Handle payment processing (Old flow - kept for compatibility)
async function handlePaymentProcessing() {
    // Payment method is always 'online' now

    // 首先提交预订到API
    try {
        await window.submitFinalBooking();

        // Handle online payment
        const onlinePaymentType = window.selectedOnlinePaymentType || '';
        handleOnlinePayment(onlinePaymentType);
    } catch (error) {
        console.error('Booking submission failed:', error);
        alert('予約処理に失敗しました。もう一度お試しください。');
        // 返回上一步
        prevStep();
    }
}

function handleOnlinePayment(paymentType) {
    const paymentStatusTitle = document.getElementById('paymentStatusTitle');
    const paymentStatusMessage = document.getElementById('paymentStatusMessage');
    const paymentMethodContent = document.getElementById('paymentMethodContent');

    switch (paymentType) {
        case 'wechat':
            paymentStatusTitle.textContent = 'WeChat Pay決済中...';
            paymentStatusMessage.textContent = 'QRコードをスキャンしてください';
            paymentMethodContent.innerHTML = '<p>WeChat PayアプリでこちらのQRコードをスキャンしてお支払いください。</p>';
            break;
        case 'stripe':
            paymentStatusTitle.textContent = 'クレジットカード決済中...';
            paymentStatusMessage.textContent = 'カード情報を処理しています';
            paymentMethodContent.innerHTML = '<p>入力されたクレジットカード情報で決済を処理しています。</p>';
            break;
    }

    // Simulate payment processing
    setTimeout(() => {
        nextStep();
    }, 3000);
}

// Handle booking completion
function handleBookingCompletion() {
    // 使用API返回的真实订单号
    const reservationNumber = window.bookingOrderCode || 'YUZAWA' + Date.now().toString().slice(-6);
    document.getElementById('reservationNumber').textContent = reservationNumber;

    // Save reservation data to localStorage (with error handling)
    try {
        const formData = collectFormData();
        formData.reservationNumber = reservationNumber;
        formData.reservationDate = new Date().toISOString();
        window.safeStorage.setItem('reservationData', JSON.stringify(formData));
    } catch (error) {
        console.warn('localStorage not available:', error);
        // Continue without localStorage - order is already saved to database
    }
}

// Update services and price
function updateServicesAndPrice() {
    const selectedServices = [];
    let additionalCost = 0;

    // Check breakfast
    const breakfast = document.getElementById('breakfast');
    if (breakfast && breakfast.checked) {
        selectedServices.push({ name: '朝食バイキング', price: 2000 });
        additionalCost += 2000;
    }

    // Check dinner
    const dinner = document.getElementById('dinner');
    if (dinner && dinner.checked) {
        selectedServices.push({ name: '夕食コース', price: 4500 });
        additionalCost += 4500;
    }

    // Check private bath
    const privateBath = document.getElementById('privateBath');
    if (privateBath && privateBath.checked) {
        selectedServices.push({ name: '貸切風呂', price: 3000 });
        additionalCost += 3000;
    }

    // Update services summary card
    updateServicesSummary(selectedServices);

    // Update total price
    updateTotalPrice(additionalCost);
}

// Update services summary card
function updateServicesSummary(services) {
    const servicesSummaryCard = document.querySelector('.services-summary');
    const servicesList = document.getElementById('selectedServices');

    if (services.length > 0) {
        servicesSummaryCard.style.display = 'block';
        servicesList.innerHTML = '';

        services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-summary-item';
            serviceItem.innerHTML = `
                <span class="service-name">${service.name}</span>
                <span class="service-cost">+¥${service.price.toLocaleString()}</span>
            `;
            servicesList.appendChild(serviceItem);
        });
    } else {
        servicesSummaryCard.style.display = 'none';
    }
}

// Update total price
// Cache for room data to avoid repeated API calls
let roomDataCache = {};

async function updateTotalPrice(additionalCost = 0) {
    // Get booking parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code') || urlParams.get('plan') || 'twin';
    const rooms = parseInt(urlParams.get('rooms') || '1');
    const adults = parseInt(urlParams.get('adults') || '2');
    const checkin = urlParams.get('checkin') || '';
    const checkout = urlParams.get('checkout') || '';

    // Calculate number of nights
    let nights = 1;
    if (checkin && checkout) {
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const timeDiff = checkoutDate - checkinDate;
        nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) || 1;
    }

    // Fetch room data from database API and calculate price based on dates
    let basePricePerNight = 0; // 不使用默认价格，必须从数据库获取
    let roomTypeName = '';

    try {
        // Check cache first
        if (roomDataCache[code]) {
            console.log('Using cached data for', code);
            basePricePerNight = roomDataCache[code].price;
            roomTypeName = roomDataCache[code].name;
        } else {
            // Use search API to get accurate pricing based on dates
            const searchApiUrl = window.getApiUrl(`/rooms/search?checkin=${checkin}&checkout=${checkout}&adults=${adults}&rooms=1`);
            console.log('Fetching room search data from API:', searchApiUrl);
            const searchResponse = await fetch(searchApiUrl);

            if (searchResponse.ok) {
                const searchResult = await searchResponse.json();
                console.log('Search API Result:', searchResult);

                if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
                    // Find the room type we're looking for
                    const roomData = searchResult.data.find(r => r.room_type_code === code);
                    if (roomData) {
                        // Use price_per_night from search result (already includes all adults and date-based pricing)
                        basePricePerNight = Math.round(roomData.price_per_night);
                        roomTypeName = roomData.room_type_name;
                        console.log('Price from search API:', basePricePerNight, 'per night (includes', adults, 'adults)');
                        console.log('Room type name:', roomTypeName);

                        // Cache the data
                        roomDataCache[code] = {
                            price: basePricePerNight,
                            name: roomTypeName
                        };
                    } else {
                        console.warn('Room type not found in search results');
                    }
                } else {
                    console.warn('Search API returned no rooms');
                }
            } else {
                console.error('Search API request failed with status:', searchResponse.status);
            }
        }
    } catch (error) {
        console.error('Room data fetch error:', error);
        // Use fallback price if API call fails
    }

    console.log('Final basePricePerNight:', basePricePerNight, 'for room code:', code);

    // Update room type display if we got the name from API
    if (roomTypeName) {
        const roomTypeElement = document.getElementById('roomType');
        if (roomTypeElement) {
            const roomText = parseInt(rooms) > 1 ? `${roomTypeName} × ${rooms}室` : roomTypeName;
            roomTypeElement.textContent = roomText;
        }
    }

    // Calculate total room price (rooms × nights × price per room)
    const totalRoomPrice = basePricePerNight * rooms * nights;

    // Calculate service costs per person (已含税)
    let serviceCostPerPerson = 0;
    if (document.getElementById('breakfast')?.checked) serviceCostPerPerson += 2200; // 含税
    if (document.getElementById('dinner')?.checked) serviceCostPerPerson += 4950; // 含税

    const totalServiceCost = (serviceCostPerPerson * adults * nights) +
                           (document.getElementById('privateBath')?.checked ? 3300 : 0); // 含税

    const total = Math.round(totalRoomPrice + totalServiceCost);

    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) {
        totalPriceElement.innerHTML = `¥${total.toLocaleString()}<span class="tax-included-text">税込</span>`;
    }
}

// Update reservation info
function updateReservationInfo() {
    // Get URL parameters for booking details
    const urlParams = new URLSearchParams(window.location.search);

    const code = urlParams.get('code') || urlParams.get('plan') || '';
    const checkin = urlParams.get('checkin') || '';
    const checkout = urlParams.get('checkout') || '';
    const rooms = urlParams.get('rooms') || '1';
    const adults = urlParams.get('adults') || '2';
    const children = urlParams.get('children') || '0';

    console.log('=== 更新预约信息 ===');
    console.log('URL参数:', { code, checkin, checkout, rooms, adults, children });

    // Update checkin date
    if (checkin) {
        const checkinElement = document.getElementById('checkinDate');
        if (checkinElement) {
            checkinElement.textContent = formatDateJapanese(checkin);
            console.log('✓ 更新入住日期:', formatDateJapanese(checkin));
        }
    }

    // Update checkout date
    if (checkout) {
        const checkoutElement = document.getElementById('checkoutDate');
        if (checkoutElement) {
            checkoutElement.textContent = formatDateJapanese(checkout);
            console.log('✓ 更新退房日期:', formatDateJapanese(checkout));
        }
    }

    // Update nights count
    if (checkin && checkout) {
        const nights = calculateNights(checkin, checkout);
        const nightsElement = document.getElementById('nightsCount');
        if (nightsElement) {
            nightsElement.textContent = `${nights}泊`;
            console.log('✓ 更新宿泊数:', `${nights}泊`);
        }
    }

    // Update room type
    if (code) {
        const roomTypeElement = document.getElementById('roomType');
        if (roomTypeElement) {
            const roomTypeNames = {
                'twin': 'ツインルーム【セミダブルベッド】',
                'triple': 'トリプルルーム【シングルベッド】',
                'quad': '和洋室 6帖和室＋洋室ツイン【シングルベッド】',
                'small_double': 'ファミリー和洋室 15帖和洋室＋洋室ツイン【セミダブルベッド】'
            };
            const roomTypeName = roomTypeNames[code] || 'ツインルーム【セミダブルベッド】';
            roomTypeElement.textContent = roomTypeName;
            console.log('✓ 更新客室类型:', roomTypeName);
        }
    }

    // Update guest count
    const guestCountElement = document.getElementById('guestCount');
    if (guestCountElement) {
        let guestText = `大人${adults}名`;
        if (children && children !== '0') {
            guestText += ` 子供${children}名`;
        }
        guestCountElement.textContent = guestText;
        console.log('✓ 更新宾客人数:', guestText);
    }

    console.log('=== 预约信息更新完成 ===');
}

// Handle form submission
function handleFormSubmission(event) {
    event.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    // Collect all form data
    const formData = collectFormData();

    // Save to localStorage for the success page (with error handling)
    try {
        window.safeStorage.setItem('reservationData', JSON.stringify(formData));
    } catch (error) {
        console.warn('localStorage not available:', error);
        // Continue without localStorage - order is already saved to database
    }

    // 清除倒计时
    clearExpirationTimer();

    // Redirect to success page (with order code if available)
    if (window.bookingOrderCode) {
        window.location.href = `reservation-success.html?orderCode=${window.bookingOrderCode}`;
    } else {
        // Fallback if order code not available (shouldn't happen in normal flow)
        console.warn('Order code not found, redirecting without it');
        window.location.href = 'reservation-success.html';
    }
}

// Collect all form data
function collectFormData() {
    // Check if separate guest fields exist in the form
    const hasGuestFields = document.getElementById('guestLastName') !== null;
    const sameAsBooker = hasGuestFields ? (document.getElementById('sameAsBooker')?.checked || false) : true;

    // Get booker information
    const bookerLastName = document.getElementById('lastName')?.value || '';
    const bookerFirstName = document.getElementById('firstName')?.value || '';
    const bookerLastNameKana = document.getElementById('lastNameKana')?.value || '';
    const bookerFirstNameKana = document.getElementById('firstNameKana')?.value || '';
    const bookerEmail = document.getElementById('email')?.value || '';
    const bookerPhone = document.getElementById('phone')?.value || '';

    return {
        // Booker info (reservation contact)
        bookerLastName: bookerLastName,
        bookerFirstName: bookerFirstName,
        bookerLastNameKana: bookerLastNameKana,
        bookerFirstNameKana: bookerFirstNameKana,
        bookerEmail: bookerEmail,
        bookerPhone: bookerPhone,
        bookerPostalCode: document.getElementById('postalCode')?.value || '',
        bookerPrefecture: document.getElementById('prefecture')?.value || '',
        bookerAddress: document.getElementById('address')?.value || '',

        // Guest info (actual guest staying) - default to booker info if separate fields don't exist
        sameAsBooker: sameAsBooker,
        guestLastName: sameAsBooker ? bookerLastName : (document.getElementById('guestLastName')?.value || bookerLastName),
        guestFirstName: sameAsBooker ? bookerFirstName : (document.getElementById('guestFirstName')?.value || bookerFirstName),
        guestLastNameKana: sameAsBooker ? bookerLastNameKana : (document.getElementById('guestLastNameKana')?.value || bookerLastNameKana),
        guestFirstNameKana: sameAsBooker ? bookerFirstNameKana : (document.getElementById('guestFirstNameKana')?.value || bookerFirstNameKana),
        guestEmail: sameAsBooker ? bookerEmail : (document.getElementById('guestEmail')?.value || bookerEmail),
        guestPhone: sameAsBooker ? bookerPhone : (document.getElementById('guestPhone')?.value || bookerPhone),

        // Stay details
        specialRequests: document.getElementById('specialRequests')?.value || '',
        breakfast: document.getElementById('breakfast')?.checked || false,
        dinner: document.getElementById('dinner')?.checked || false,
        privateBath: document.getElementById('privateBath')?.checked || false,

        // Payment method and card info
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'onsite',
        onlinePaymentType: window.selectedOnlinePaymentType || '',
        cardNumber: document.getElementById('cardNumber')?.value || '',
        cardName: document.getElementById('cardName')?.value || '',
        cardExpiry: document.getElementById('cardExpiry')?.value || '',
        cardCVC: document.getElementById('cardCVC')?.value || '',

        // Reservation details from URL
        checkinDate: new URLSearchParams(window.location.search).get('checkin') || getDefaultDate(),
        checkoutDate: new URLSearchParams(window.location.search).get('checkout') || getDefaultDate(1),
        adults: new URLSearchParams(window.location.search).get('adults') || '2',
        children: new URLSearchParams(window.location.search).get('children') || '0',
        roomType: new URLSearchParams(window.location.search).get('plan') || 'ツインルーム【セミダブルベッド】'
    };
}

// Postal code auto-completion functions
function handlePostalCodeInput(event) {
    let value = event.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters

    // Auto-format with hyphen
    if (value.length >= 4) {
        value = value.substring(0, 3) + '-' + value.substring(3, 7);
    }

    event.target.value = value;

    // Clear previous address if postal code is being modified
    if (value.length < 8) {
        clearAddressFields();
    }
}

function lookupPostalCode() {
    const postalCode = document.getElementById('postalCode').value;
    const cleanPostalCode = postalCode.replace(/[^0-9]/g, '');

    // Validate postal code format (7 digits)
    if (cleanPostalCode.length === 7) {
        fetchAddressFromPostalCode(cleanPostalCode);
    }
}

async function fetchAddressFromPostalCode(postalCode) {
    try {
        // Show loading indicator
        showPostalCodeLoading(true);

        // Use zipcloud API for Japanese postal code lookup
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
        const data = await response.json();

        if (data.status === 200 && data.results && data.results.length > 0) {
            const address = data.results[0];
            fillAddressFields(address);
        } else {
            // Show error if no results found
            showPostalCodeError('郵便番号が見つかりませんでした');
        }
    } catch (error) {
        console.error('Postal code lookup error:', error);
        showPostalCodeError('住所の検索中にエラーが発生しました');
    } finally {
        showPostalCodeLoading(false);
    }
}

function fillAddressFields(addressData) {
    const prefectureSelect = document.getElementById('prefecture');
    const addressInput = document.getElementById('address');

    // Map prefecture name to select value
    const prefectureMap = {
        '北海道': 'hokkaido',
        '青森県': 'aomori',
        '岩手県': 'iwate',
        '宮城県': 'miyagi',
        '秋田県': 'akita',
        '山形県': 'yamagata',
        '福島県': 'fukushima',
        '茨城県': 'ibaraki',
        '栃木県': 'tochigi',
        '群馬県': 'gunma',
        '埼玉県': 'saitama',
        '千葉県': 'chiba',
        '東京都': 'tokyo',
        '神奈川県': 'kanagawa',
        '新潟県': 'niigata',
        '富山県': 'toyama',
        '石川県': 'ishikawa',
        '福井県': 'fukui',
        '山梨県': 'yamanashi',
        '長野県': 'nagano',
        '岐阜県': 'gifu',
        '静岡県': 'shizuoka',
        '愛知県': 'aichi',
        '三重県': 'mie',
        '滋賀県': 'shiga',
        '京都府': 'kyoto',
        '大阪府': 'osaka',
        '兵庫県': 'hyogo',
        '奈良県': 'nara',
        '和歌山県': 'wakayama',
        '鳥取県': 'tottori',
        '島根県': 'shimane',
        '岡山県': 'okayama',
        '広島県': 'hiroshima',
        '山口県': 'yamaguchi',
        '徳島県': 'tokushima',
        '香川県': 'kagawa',
        '愛媛県': 'ehime',
        '高知県': 'kochi',
        '福岡県': 'fukuoka',
        '佐賀県': 'saga',
        '長崎県': 'nagasaki',
        '熊本県': 'kumamoto',
        '大分県': 'oita',
        '宮崎県': 'miyazaki',
        '鹿児島県': 'kagoshima',
        '沖縄県': 'okinawa'
    };

    // Set prefecture
    if (prefectureSelect && prefectureMap[addressData.address1]) {
        prefectureSelect.value = prefectureMap[addressData.address1];
        prefectureSelect.style.borderColor = '#28a745'; // Green border to indicate auto-filled
    }

    // Set city and town
    if (addressInput) {
        const cityTown = (addressData.address2 || '') + (addressData.address3 || '');
        addressInput.value = cityTown;
        addressInput.style.borderColor = '#28a745'; // Green border to indicate auto-filled

        // Focus on address field for user to add building details
        setTimeout(() => {
            addressInput.focus();
            addressInput.setSelectionRange(addressInput.value.length, addressInput.value.length);
        }, 100);
    }

    clearPostalCodeMessages();
}

function clearAddressFields() {
    const prefectureSelect = document.getElementById('prefecture');
    const addressInput = document.getElementById('address');

    if (prefectureSelect) {
        prefectureSelect.value = '';
        prefectureSelect.style.borderColor = '#e9ecef';
    }

    if (addressInput) {
        addressInput.value = '';
        addressInput.style.borderColor = '#e9ecef';
    }
}

function showPostalCodeLoading(show) {
    const postalCodeInput = document.getElementById('postalCode');
    if (show) {
        postalCodeInput.style.borderColor = '#D2691E';
        postalCodeInput.style.background = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiNmNWY1ZjUiLz4KPHBhdGggZD0ibTEwIDEgYTkgOSAwIDAgMSAwIDE4IiBzdHJva2U9IiNEMjY5MUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj4KPGFuaW1hdGVUcmFuc2Zvcm0gYXR0cmlidXRlTmFtZT0idHJhbnNmb3JtIiB0eXBlPSJyb3RhdGUiIGR1cj0iMXMiIHZhbHVlcz0iMCAxMCAxMDszNjAgMTAgMTAiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CjwvcGF0aD4KPC9zdmc+") no-repeat right 10px center';
        postalCodeInput.style.backgroundSize = '20px 20px';
    } else {
        postalCodeInput.style.background = 'white';
        postalCodeInput.style.borderColor = '#e9ecef';
    }
}

function showPostalCodeError(message) {
    const postalCodeInput = document.getElementById('postalCode');
    postalCodeInput.style.borderColor = '#dc3545';

    // Create or update error message
    let errorDiv = document.getElementById('postalCodeError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'postalCodeError';
        errorDiv.style.cssText = 'color: #dc3545; font-size: 12px; margin-top: 5px;';
        postalCodeInput.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;

    // Clear error after 3 seconds
    setTimeout(clearPostalCodeMessages, 3000);
}

function clearPostalCodeMessages() {
    const errorDiv = document.getElementById('postalCodeError');
    if (errorDiv) {
        errorDiv.remove();
    }

    const postalCodeInput = document.getElementById('postalCode');
    postalCodeInput.style.borderColor = '#e9ecef';
}

// Handle "same as booker" functionality
function handleSameAsBooker() {
    const sameAsBookerCheckbox = document.getElementById('sameAsBooker');
    const guestInfoSection = document.getElementById('guestInfoSection');

    if (sameAsBookerCheckbox.checked) {
        // Hide guest information section
        guestInfoSection.style.display = 'none';
        setGuestFieldsRequired(false);
        clearGuestFields();
    } else {
        // Show guest information section
        guestInfoSection.style.display = 'block';
        setGuestFieldsRequired(true);
    }
}

function copyBookerToGuest() {
    // Get booker information
    const bookerLastName = document.getElementById('lastName')?.value || '';
    const bookerFirstName = document.getElementById('firstName')?.value || '';
    const bookerLastNameKana = document.getElementById('lastNameKana')?.value || '';
    const bookerFirstNameKana = document.getElementById('firstNameKana')?.value || '';

    // Set guest information
    const guestLastName = document.getElementById('guestLastName');
    const guestFirstName = document.getElementById('guestFirstName');
    const guestLastNameKana = document.getElementById('guestLastNameKana');
    const guestFirstNameKana = document.getElementById('guestFirstNameKana');

    if (guestLastName) guestLastName.value = bookerLastName;
    if (guestFirstName) guestFirstName.value = bookerFirstName;
    if (guestLastNameKana) guestLastNameKana.value = bookerLastNameKana;
    if (guestFirstNameKana) guestFirstNameKana.value = bookerFirstNameKana;
}

function clearGuestFields() {
    const guestLastName = document.getElementById('guestLastName');
    const guestFirstName = document.getElementById('guestFirstName');
    const guestLastNameKana = document.getElementById('guestLastNameKana');
    const guestFirstNameKana = document.getElementById('guestFirstNameKana');
    const guestEmail = document.getElementById('guestEmail');
    const guestPhone = document.getElementById('guestPhone');

    if (guestLastName) guestLastName.value = '';
    if (guestFirstName) guestFirstName.value = '';
    if (guestLastNameKana) guestLastNameKana.value = '';
    if (guestFirstNameKana) guestFirstNameKana.value = '';
    if (guestEmail) guestEmail.value = '';
    if (guestPhone) guestPhone.value = '';
}

function setGuestFieldsRequired(required) {
    const guestFields = [
        'guestLastName',
        'guestFirstName',
        'guestLastNameKana',
        'guestFirstNameKana',
        'guestEmail',
        'guestPhone'
    ];

    guestFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (required) {
                field.setAttribute('required', '');
            } else {
                field.removeAttribute('required');
            }
        }
    });
}

// Payment method handling - Removed as online payment is now mandatory

async function handlePaymentButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    // Get selected payment type
    const selectedType = event.currentTarget.getAttribute('data-payment');
    const isAlreadyActive = event.currentTarget.classList.contains('active');

    console.log('用户选择了支付方式:', selectedType, '已激活:', isAlreadyActive);

    const qrcodeSection = document.getElementById('qrcodeSection');
    const creditCardSection = document.getElementById('creditCardSection');
    const linkPaymentSection = document.getElementById('linkPaymentSection');
    const expressPaymentSection = document.getElementById('expressPaymentSection');
    const expressCheckoutElement = document.getElementById('express-checkout-element');

    // 如果点击的是已激活的按钮，则收起对应区域
    if (isAlreadyActive) {
        event.currentTarget.classList.remove('active');
        window.selectedOnlinePaymentType = null;

        // 收起对应的支付区域
        if (selectedType === 'stripe' && creditCardSection) {
            creditCardSection.style.display = 'none';
        } else if (selectedType === 'wechat' && qrcodeSection) {
            qrcodeSection.style.display = 'none';
        } else if (selectedType === 'link' && linkPaymentSection) {
            linkPaymentSection.style.display = 'none';
        } else if ((selectedType === 'applepay' || selectedType === 'googlepay') && expressPaymentSection) {
            expressPaymentSection.style.display = 'none';
        }
        return;
    }

    // Remove active class from all payment buttons
    const paymentButtons = document.querySelectorAll('.payment-btn');
    paymentButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    event.currentTarget.classList.add('active');

    window.selectedOnlinePaymentType = selectedType;

    // Clear any error highlighting on payment buttons area
    const paymentButtonsContainer = document.querySelector('.payment-method-buttons');
    if (paymentButtonsContainer) {
        paymentButtonsContainer.style.border = '';
        paymentButtonsContainer.style.borderRadius = '';
        paymentButtonsContainer.style.padding = '';
    }

    // 先隐藏所有支付区域（确保切换时干净）
    if (qrcodeSection) qrcodeSection.style.display = 'none';
    if (creditCardSection) creditCardSection.style.display = 'none';
    if (linkPaymentSection) linkPaymentSection.style.display = 'none';
    if (expressPaymentSection) expressPaymentSection.style.display = 'none';

    // 微信、支付宝：直接显示二维码
    // 信用卡：使用Stripe Card Element
    // Link：使用Stripe Payment Element（启用Link）
    // Apple Pay / Google Pay：使用Stripe Payment Request Button
    if (selectedType === 'wechat') {
        // 显示二维码区域
        if (qrcodeSection) {
            qrcodeSection.style.display = 'block';
        }
        // 隐藏 Express Checkout Element（避免与微信支付弹窗冲突）
        if (expressCheckoutElement) {
            expressCheckoutElement.style.display = 'none';
        }
        // 调用二维码支付流程
        await proceedWithStripeQRPayment(selectedType);
    } else if (selectedType === 'applepay' || selectedType === 'googlepay') {
        // 显示 Express Payment 区域
        if (expressPaymentSection) {
            expressPaymentSection.style.display = 'block';
        }
        // 隐藏 Express Checkout Element
        if (expressCheckoutElement) {
            expressCheckoutElement.style.display = 'none';
        }
        // 调用 Apple Pay / Google Pay 支付流程
        await proceedWithExpressPayment(selectedType);
    } else if (selectedType === 'link') {
        // 隐藏 Express Checkout Element
        if (expressCheckoutElement) {
            expressCheckoutElement.style.display = 'none';
        }
        // 显示Link支付区域
        if (linkPaymentSection) {
            linkPaymentSection.style.display = 'block';
        }
        // 使用Stripe Link Payment
        await proceedWithLinkPayment();
    } else {
        // 信用卡支付 (stripe)
        // 显示信用卡区域
        if (creditCardSection) {
            creditCardSection.style.display = 'block';
        }
        // 使用Stripe Card Element（支持信用卡）
        await proceedWithStripePayment();
    }
}

// 显示 Express Checkout Element（支付完成或取消后恢复）
function showExpressCheckoutElement() {
    const expressCheckoutElement = document.getElementById('express-checkout-element');
    if (expressCheckoutElement) {
        expressCheckoutElement.style.display = 'block';
    }
}

// Display payment QR code
async function displayPaymentQRCode(paymentType) {
    const qrcodeImage = document.getElementById('qrcodeImage');

    try {
        // Show loading state
        qrcodeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==';
        qrcodeImage.alt = 'Loading QR Code...';

        // Collect order data
        const formData = collectFormData();
        const urlParams = new URLSearchParams(window.location.search);

        // Calculate total amount
        const basePrice = 18000;
        const taxRate = 0.1;
        const adults = parseInt(urlParams.get('adults') || '2');
        let serviceCostPerPerson = 0;
        if (formData.breakfast) serviceCostPerPerson += 2000;
        if (formData.dinner) serviceCostPerPerson += 4500;
        const totalServiceCost = (serviceCostPerPerson * adults) + (formData.privateBath ? 3000 : 0);
        const subtotal = basePrice + totalServiceCost;
        const tax = Math.round(subtotal * taxRate);
        const total = subtotal + tax;

        // Generate order number
        const orderNum = 'YUZAWA' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 6).toUpperCase();

        console.log('=== 创建EvoPay支付 ===');
        console.log('订单号:', orderNum);
        console.log('金额:', total, '日元');
        console.log('支付类型:', paymentType);

        // Call EvoPay API
        const response = await fetch(window.getApiUrl('/evopay/create-payment'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderNum: orderNum,
                amount: total / 100, // Convert to yuan (assuming 1 yuan = 100 yen rate, adjust as needed)
                payType: paymentType,
                orderType: 'hotel',
                subject: '酒店预订'
            })
        });

        const result = await response.json();
        console.log('EvoPay API响应:', result);

        if (result.success && result.data) {
            // Display QR code from EvoPay
            qrcodeImage.src = result.data.qrCode;
            qrcodeImage.alt = 'WeChat Pay QR Code';

            // Store order number for later use
            window.currentPaymentOrderNum = result.data.orderNum;

            // Start QR code timer (15 minutes)
            startQRCodeTimer();
        } else {
            throw new Error(result.message || 'QRコードの生成に失敗しました');
        }
    } catch (error) {
        console.error('EvoPay error:', error);
        alert('決済処理に失敗しました: ' + error.message);

        // Show error state
        qrcodeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2ZmZWJlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNkYzM1NDUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
        qrcodeImage.alt = 'Error loading QR Code';
    }
}

// Start QR code countdown timer
function startQRCodeTimer() {
    const qrcodeTimer = document.getElementById('qrcodeTimer');
    let timeLeft = 15 * 60; // 15 minutes in seconds

    // Clear any existing timer
    if (window.qrCodeTimerInterval) {
        clearInterval(window.qrCodeTimerInterval);
    }

    window.qrCodeTimerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        qrcodeTimer.textContent = `有効時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(window.qrCodeTimerInterval);
            qrcodeTimer.textContent = '有効期限が切れました';
            qrcodeTimer.style.color = '#dc3545';
        }

        timeLeft--;
    }, 1000);
}

function setCreditCardFieldsRequired(required) {
    const cardFields = ['cardNumber', 'cardName', 'cardExpiry', 'cardCVC'];

    cardFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (required) {
                field.setAttribute('required', '');
            } else {
                field.removeAttribute('required');
                field.value = ''; // Clear field when not required
            }
        }
    });
}

// Credit card input formatting
function formatCardNumber(event) {
    let value = event.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    event.target.value = formattedValue.substring(0, 19); // Limit to 16 digits + 3 spaces
}

function formatCardExpiry(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    event.target.value = value;
}

// Completely lock a field to prevent any modification
function lockFieldCompletely(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Store original value
    const originalValue = field.value;

    // Prevent all input events
    const preventInput = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    // Prevent all keyboard events
    field.addEventListener('keydown', preventInput, true);
    field.addEventListener('keypress', preventInput, true);
    field.addEventListener('keyup', preventInput, true);
    field.addEventListener('input', preventInput, true);

    // Prevent paste
    field.addEventListener('paste', preventInput, true);

    // Prevent cut
    field.addEventListener('cut', preventInput, true);

    // Prevent drag/drop
    field.addEventListener('drop', preventInput, true);
    field.addEventListener('dragover', preventInput, true);

    // For select elements, prevent change
    if (field.tagName === 'SELECT') {
        field.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();
            field.value = originalValue;
            return false;
        }, true);

        // Prevent mouse interaction on select
        field.addEventListener('mousedown', preventInput, true);
        field.addEventListener('click', preventInput, true);
    }

    // Reset value if it changes somehow
    const observer = new MutationObserver(() => {
        if (field.value !== originalValue) {
            field.value = originalValue;
        }
    });

    observer.observe(field, {
        attributes: true,
        attributeFilter: ['value']
    });
}

// Stripe Payment Handler - 在确认页面处理Stripe支付
async function proceedWithStripePayment() {
    try {
        console.log('开始Stripe支付流程...');

        // 获取临时订单编号
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : window.currentTempOrderCode;

        if (!tempOrderCode) {
            alert('临时订单不存在，请刷新页面重试');
            return;
        }

        console.log('💳 从数据库读取临时订单数据:', tempOrderCode);

        // 从数据库读取临时订单数据
        const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}`), {
            credentials: 'include'
        });
        const result = await response.json();

        if (!result.success || !result.data) {
            alert('无法读取订单数据，请刷新页面重试');
            return;
        }

        const tempOrder = result.data;
        console.log('✅ 临时订单数据:', tempOrder);

        // 准备订单数据（使用临时订单中的数据）
        const orderData = {
            userId: tempOrder.user_id,
            bookerEmail: tempOrder.guest_email,
            guestLastName: tempOrder.guest_last_name,
            guestFirstName: tempOrder.guest_first_name,
            guestLastNameKana: tempOrder.guest_last_name_katakana || '',
            guestFirstNameKana: tempOrder.guest_first_name_katakana || '',
            roomType: tempOrder.room_type_name || 'ツインルーム【セミダブルベッド】',
            checkinDate: tempOrder.checkin_date,
            checkoutDate: tempOrder.checkout_date,
            adults: tempOrder.num_adults,
            children: tempOrder.num_children || 0,
            services: [],

            // 重要：使用服务器计算的价格
            totalPrice: parseFloat(tempOrder.total_price),
            roomPrice: parseFloat(tempOrder.room_price),

            // 关键：添加积分和最终金额相关字段
            final_amount: parseFloat(tempOrder.final_amount),
            points_used: parseInt(tempOrder.points_used) || 0,
            service_cost: parseFloat(tempOrder.service_cost) || 0
        };

        // 添加选择的服务
        if (tempOrder.breakfast_selected) {
            orderData.services.push({ name: '朝食バイキング', price: 2000, quantity: parseInt(tempOrder.num_adults) });
        }
        if (tempOrder.dinner_selected) {
            orderData.services.push({ name: '夕食コース', price: 4500, quantity: parseInt(tempOrder.num_adults) });
        }
        if (tempOrder.private_bath_selected) {
            orderData.services.push({ name: '貸切風呂', price: 3000, quantity: 1 });
        }

        // 使用临时订单编号
        orderData.orderCode = tempOrder.order_code;

        console.log('💰 订单数据（从数据库）:', orderData);
        console.log('💰 服务器计算的价格:', tempOrder.total_price);
        console.log('💰 最终支付金额 (final_amount):', tempOrder.final_amount);
        console.log('💰 使用的积分 (points_used):', tempOrder.points_used);

        // 调用Stripe支付
        await window.createStripeCheckoutSession(orderData);

    } catch (error) {
        console.error('Stripe支付错误:', error);
        alert('Stripe決済の開始に失敗しました。もう一度お試しください。\n\nエラー: ' + error.message);
    }
}

// 处理Link支付（嵌入式 Payment Element）
async function proceedWithLinkPayment() {
    try {
        console.log('开始Link支付流程（嵌入式）...');

        // 收集订单数据
        const formData = collectFormData();
        console.log('收集到的表单数据:', formData);

        // 验证必填字段
        if (!formData.bookerEmail) {
            alert('メールアドレスを入力してください。');
            return;
        }
        if (!formData.guestLastName || !formData.guestFirstName) {
            alert('宿泊者のお名前を入力してください。');
            return;
        }

        // 获取临时订单编号
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : window.currentTempOrderCode;

        if (!tempOrderCode) {
            alert('予約情報が見つかりません。ページを更新してください。');
            return;
        }

        // 从数据库读取临时订单数据
        const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}`), {
            credentials: 'include'
        });
        const result = await response.json();

        if (!result.success || !result.data) {
            alert('予約データの読み込みに失敗しました。');
            return;
        }

        const tempOrder = result.data;
        console.log('✅ 临时订单数据:', tempOrder);

        // 获取用户信息（如果已登录）
        let userId = null;
        try {
            const currentUser = window.safeStorage.getItem('currentUser');
            if (currentUser) {
                const userData = JSON.parse(currentUser);
                userId = userData.user_id;
            }
        } catch (e) {
            console.log('未找到登录用户');
        }

        // 准备订单数据（使用临时订单中的数据）
        const urlParams = new URLSearchParams(window.location.search);
        const orderData = {
            userId: userId || tempOrder.user_id,
            orderCode: tempOrder.order_code,
            bookerEmail: tempOrder.guest_email,
            guestLastName: tempOrder.guest_last_name,
            guestFirstName: tempOrder.guest_first_name,
            guestLastNameKana: tempOrder.guest_last_name_katakana || '',
            guestFirstNameKana: tempOrder.guest_first_name_katakana || '',
            guestPhone: tempOrder.guest_phone || '',
            phoneCountryCode: tempOrder.phone_country_code || '+81',
            country: tempOrder.country || '',
            postalCode: tempOrder.postal_code || '',
            prefecture: tempOrder.prefecture || '',
            city: tempOrder.city || '',
            addressLine: tempOrder.address_line || '',
            roomType: tempOrder.room_type_name || decodeURIComponent(urlParams.get('plan') || 'ツインルーム【セミダブルベッド】'),
            roomTypeCode: tempOrder.room_type_code || '',
            checkinDate: tempOrder.checkin_date,
            checkoutDate: tempOrder.checkout_date,
            adults: tempOrder.num_adults,
            children: tempOrder.num_children || 0,
            numRooms: tempOrder.num_rooms || 1,
            roomPrice: parseFloat(tempOrder.room_price) || 0,
            totalPrice: parseFloat(tempOrder.total_price),
            final_amount: parseFloat(tempOrder.final_amount),
            points_used: parseInt(tempOrder.points_used) || 0,
            breakfastSelected: tempOrder.breakfast_selected,
            dinnerSelected: tempOrder.dinner_selected,
            privateBathSelected: tempOrder.private_bath_selected,
            serviceCost: parseFloat(tempOrder.service_cost) || 0,
            specialRequests: tempOrder.special_requests || '',
            services: []
        };

        // 添加选择的服务
        if (tempOrder.breakfast_selected) {
            orderData.services.push({ name: '朝食バイキング', price: 2000, quantity: parseInt(tempOrder.num_adults) });
        }
        if (tempOrder.dinner_selected) {
            orderData.services.push({ name: '夕食コース', price: 4500, quantity: parseInt(tempOrder.num_adults) });
        }
        if (tempOrder.private_bath_selected) {
            orderData.services.push({ name: '貸切風呂', price: 3000, quantity: 1 });
        }

        console.log('💳 订单数据:', orderData);
        console.log('💰 最终支付金额:', orderData.final_amount);

        // 使用 stripe-payment.js 中的嵌入式 Link 支付初始化
        if (typeof window.initializeLinkPaymentForm === 'function') {
            await window.initializeLinkPaymentForm(orderData);
        } else {
            console.error('initializeLinkPaymentForm 函数未找到');
            alert('Link決済の初期化に失敗しました。ページを更新してください。');
        }

    } catch (error) {
        console.error('Link支付错误:', error);

        // 恢复Link支付区域
        const linkPaymentSection = document.getElementById('linkPaymentSection');
        if (linkPaymentSection) {
            linkPaymentSection.innerHTML = `
                <h3 class="section-title">
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="#0066cc" style="vertical-align: middle; margin-right: 8px;">
                        <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                        <circle cx="10" cy="10" r="2"/>
                    </svg>
                    Link で支払う
                </h3>
                <div style="padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin-top: 20px;">
                    <p style="color: #856404; margin: 0;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                        エラー: ${error.message}
                    </p>
                    <p style="color: #856404; margin: 10px 0 0 0; font-size: 14px;">
                        もう一度お試しいただくか、他の支払い方法をお選びください。
                    </p>
                </div>
            `;
        }

        alert('Link決済の開始に失敗しました。もう一度お試しください。\n\nエラー: ' + error.message);
    }
}

// ========== 积分系统功能 ==========

// 全局变量存储用户积分和订单金额
let userLoyaltyPoints = 0;
let currentOrderTotal = 0;

// 加载用户积分余额（从数据库API读取，不使用localStorage缓存）
async function loadUserPoints() {
    try {
        const userData = window.safeStorage ? window.safeStorage.getItem('currentUser') : null;
        if (!userData) {
            console.log('用户未登录，隐藏积分选项');
            document.getElementById('pointsRedemptionSection').style.display = 'none';
            return;
        }

        const user = JSON.parse(userData);
        // 强制从数据库读取最新积分（添加时间戳防止缓存）
        const response = await fetch(window.getApiUrl(`/loyalty/balance/${user.user_id}?t=${Date.now()}`));
        const result = await response.json();

        if (result.success) {
            // 从API获取的数据库最新积分
            userLoyaltyPoints = result.data.loyalty_points || 0;
            document.getElementById('availablePoints').textContent = userLoyaltyPoints;

            // 同步更新localStorage中的积分值（仅用于显示，下次进入页面会重新从数据库读取）
            if (window.safeStorage) {
                const updatedUser = JSON.parse(userData);
                updatedUser.loyalty_points = userLoyaltyPoints;
                window.safeStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }

            // 计算可用积分（最多30%）
            calculateMaxUsablePoints();

            console.log(`✅ 从数据库读取用户积分: ${userLoyaltyPoints}`);
        } else {
            console.error('获取积分失败:', result.message);
        }
    } catch (error) {
        console.error('加载用户积分错误:', error);
        document.getElementById('pointsRedemptionSection').style.display = 'none';
    }
}

// 计算最大可用积分
function calculateMaxUsablePoints() {
    // 获取当前订单总额 - 从右侧预订信息卡获取
    const totalPriceElement = document.getElementById('totalPrice');
    const totalAmountText = totalPriceElement?.textContent || '¥0';
    currentOrderTotal = parseInt(totalAmountText.replace(/[¥,]/g, '')) || 0;

    // 如果右侧元素没有值，尝试从全局变量获取
    if (currentOrderTotal === 0 && window.currentTempOrderData) {
        currentOrderTotal = parseInt(window.currentTempOrderData.total_price) || 0;
    }

    // 最多可用30%
    const maxPoints = Math.min(
        userLoyaltyPoints,
        Math.floor(currentOrderTotal * 0.3)
    );

    document.getElementById('maxUsablePoints').textContent = maxPoints;
    document.getElementById('pointsToUse').max = maxPoints;

    console.log(`订单总额: ¥${currentOrderTotal}, 最大可用积分: ${maxPoints}`);
}

// 使用全部可用积分
function useAllAvailablePoints() {
    const maxPoints = parseInt(document.getElementById('maxUsablePoints').textContent);
    document.getElementById('pointsToUse').value = maxPoints;
    calculatePointsDiscount();
}

// 计算积分抵扣金额
async function calculatePointsDiscount() {
    const pointsToUse = parseInt(document.getElementById('pointsToUse').value) || 0;
    const maxPoints = parseInt(document.getElementById('maxUsablePoints').textContent);

    // 验证输入
    if (pointsToUse > maxPoints) {
        document.getElementById('pointsToUse').value = maxPoints;
        alert(`使用可能なポイントは最大 ${maxPoints} ポイントです`);
        return;
    }

    if (pointsToUse < 0) {
        document.getElementById('pointsToUse').value = 0;
        return;
    }

    // 计算最终金额
    const finalAmount = currentOrderTotal - pointsToUse;

    // 更新最终支付金额显示
    const finalPaymentElement = document.getElementById('finalPaymentAmount');
    if (finalPaymentElement) {
        finalPaymentElement.textContent = `¥${finalAmount.toLocaleString()}`;
    }

    // 显示抵扣金额
    if (pointsToUse > 0) {
        document.getElementById('pointsDiscountAmount').textContent = pointsToUse.toLocaleString();
        document.getElementById('pointsDiscountInfo').style.display = 'block';

        // 更新支付页面的总金额显示（如果在支付页面）
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            totalPriceElement.innerHTML = `<span style="text-decoration: line-through; color: #999; margin-right: 10px;">¥${currentOrderTotal.toLocaleString()}</span><span style="color: #F57C00; font-weight: bold;">¥${finalAmount.toLocaleString()}</span>`;
        }

        console.log(`使用 ${pointsToUse} 积分，抵扣后金额: ¥${finalAmount}`);
    } else {
        document.getElementById('pointsDiscountInfo').style.display = 'none';

        // 恢复原始金额显示
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            totalPriceElement.textContent = `¥${currentOrderTotal.toLocaleString()}`;
        }
    }

    // 实时更新临时订单中的积分使用信息
    await updateTempOrderPoints(pointsToUse, finalAmount);
}

// 更新临时订单的积分使用信息
async function updateTempOrderPoints(pointsUsed, finalAmount) {
    try {
        // 获取临时订单编号
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : window.currentTempOrderCode;

        if (!tempOrderCode) {
            console.warn('⚠️ No temp order code, cannot update points');
            return;
        }

        console.log(`💎 Updating temp order with ${pointsUsed} points, final amount: ¥${finalAmount}`);

        // 调用 API 更新临时订单
        const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}/update-points`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                points_used: pointsUsed,
                final_amount: finalAmount
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Temp order points updated successfully');
            // 同步更新本地数据
            if (window.currentTempOrderData) {
                window.currentTempOrderData.points_used = pointsUsed;
                window.currentTempOrderData.final_amount = finalAmount;
                console.log('✅ Local order data updated: points_used=' + pointsUsed + ', final_amount=' + finalAmount);
            }
        } else {
            console.error('❌ Failed to update temp order points:', result.message);
            // 积分不足时重新加载用户积分并重置输入
            if (result.data && result.data.available_points !== undefined) {
                alert(`ポイント不足です。利用可能: ${result.data.available_points}ポイント`);
                userLoyaltyPoints = result.data.available_points;
                document.getElementById('availablePoints').textContent = userLoyaltyPoints;
                document.getElementById('pointsToUse').value = '';
                document.getElementById('pointsToUse').max = userLoyaltyPoints;
                calculateMaxUsablePoints();
            }
        }
    } catch (error) {
        console.error('❌ Error updating temp order points:', error);
    }
}

// 在步骤切换到支付页面时初始化积分
document.addEventListener('DOMContentLoaded', function() {
    // 监听积分输入变化
    const pointsInput = document.getElementById('pointsToUse');
    if (pointsInput) {
        pointsInput.addEventListener('input', calculatePointsDiscount);
        pointsInput.addEventListener('change', calculatePointsDiscount);
    }
});

// Global functions for HTML onclick handlers
window.nextStep = nextStep;
window.prevStep = prevStep;
window.proceedWithStripePayment = proceedWithStripePayment;
window.proceedWithLinkPayment = proceedWithLinkPayment;
window.useAllAvailablePoints = useAllAvailablePoints;
window.calculatePointsDiscount = calculatePointsDiscount;

// Export timer function for order-temp.js
window.startExpirationTimer = startExpirationTimer;