<?php
/**
 * AI聊天API代理 - 新版本
 * 用于解决CORS跨域问题
 */

// 关闭输出缓冲，立即显示错误
@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', false);

// 设置错误处理
error_reporting(E_ALL);
ini_set('display_errors', '0'); // 不直接显示错误，通过JSON返回
ini_set('log_errors', '1');

// 自定义错误处理函数
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'PHP Error',
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
});

// 自定义异常处理函数
set_exception_handler(function($exception) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Exception',
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ]);
    exit;
});

// 允许跨域访问
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// 处理OPTIONS预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 只允许POST请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed', 'method' => $_SERVER['REQUEST_METHOD']]);
    exit();
}

// 读取请求数据
$requestData = file_get_contents('php://input');

if (empty($requestData)) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
    exit();
}

// API目标地址
$apiUrl = 'https://tk2-209-14484.vs.sakura.ne.jp:3000/invoke';

// 检查curl扩展
if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL extension is not available']);
    exit();
}

// 初始化cURL
$ch = curl_init($apiUrl);

if ($ch === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to initialize cURL']);
    exit();
}

// 设置cURL选项
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($requestData)
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

// 执行请求
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);

curl_close($ch);

// 处理cURL错误
if ($curlErrno !== 0) {
    http_response_code(502);
    echo json_encode([
        'error' => 'API request failed',
        'curl_error' => $curlError,
        'curl_errno' => $curlErrno
    ]);
    exit();
}

// 返回API响应
http_response_code($httpCode);
echo $response;
