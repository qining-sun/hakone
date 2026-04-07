// 批量修复所有 JS 文件中的 API_BASE_URL 配置
const fs = require('fs');
const path = require('path');

const filesToFix = [
    'js/booking-api.js',
    'js/booking-user.js',
    'js/init.js',
    'js/order-detail.js',
    'js/order-temp.js',
    'js/reservation.js',
    'js/room-search.js',
    'js/stripe-payment.js',
    'js/user-center.js'
];

const oldPattern = /window\.API_BASE_URL\s*=\s*.*?5000\/api['"`;]/g;
const newValue = "window.API_BASE_URL = window.API_BASE_URL || `http://${window.location.hostname}:5000`;";

console.log('开始修复 API_BASE_URL 配置...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  文件不存在: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // 替换所有匹配的模式
    content = content.replace(
        /window\.API_BASE_URL\s*=\s*window\.API_BASE_URL\s*\|\|\s*`http:\/\/\$\{window\.location\.hostname\}:5000\/api`;/g,
        newValue
    );

    content = content.replace(
        /window\.API_BASE_URL\s*=\s*`http:\/\/\$\{window\.location\.hostname\}:5000\/api`;/g,
        newValue
    );

    content = content.replace(
        /const\s+API_BASE_URL\s*=\s*`http:\/\/\$\{window\.location\.hostname\}:5000\/api`;/g,
        `const API_BASE_URL = window.API_BASE_URL || \`http://\${window.location.hostname}:5000\`;`
    );

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ 已修复: ${file}`);
        fixedCount++;
    } else {
        console.log(`   跳过: ${file} (无需修改)`);
    }
});

console.log(`\n✅ 完成! 共修复 ${fixedCount} 个文件`);
