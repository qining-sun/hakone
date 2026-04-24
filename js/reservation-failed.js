// Thin loader: 真正的实装は hotel-api/api/static/shared/reservation-failed.js
// このファイルを触っても反映されない。ロジック変更は shared 側を編集すること。
(function () {
    var base;
    if (window.getApiUrl) {
        base = window.getApiUrl('shared');
    } else {
        base = (window.API_BASE_URL || '/api') + '/shared';
    }
    document.write('<script src="' + base + '/reservation-failed.js?v=20260424"></scr' + 'ipt>');
})();
