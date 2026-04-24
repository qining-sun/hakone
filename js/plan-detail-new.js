// Thin loader: 真正的实装は hotel-api/api/static/shared/plan-detail-new.js
// このファイルを触っても反映されない。ロジック変更は shared 側を編集すること。
(function () {
    var base;
    if (window.getApiUrl) {
        base = window.getApiUrl('shared');
    } else {
        base = (window.API_BASE_URL || '/api') + '/shared';
    }
    var url = base + '/plan-detail-new.js?v=20260424';
    if (document.readyState === 'loading') {
        // 文档还在解析：document.write 保持同步执行顺序
        document.write('<script src="' + url + '"></scr' + 'ipt>');
    } else {
        // 已解析完毕（动态注入场景）：用异步追加避免 document.write 报错
        var s = document.createElement('script');
        s.src = url;
        s.async = false;
        document.head.appendChild(s);
    }
})();
