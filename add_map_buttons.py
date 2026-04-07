#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为area.html的所有景点卡片添加地图按钮
"""

import re

# 景点坐标数据 (景点名称: (纬度, 经度))
attractions_coords = {
    '湯沢中央公園': (36.9333, 138.8111),
    '湯沢高原アルプの里': (36.9228, 138.8364),
    '湯沢いちご村': (36.9167, 138.7833),
    '魚沼の里': (37.0667, 138.8833),
    'GALA湯沢': (36.9472, 138.8611),
    '大源太キャニオン': (36.9853, 138.7906),
    '湯沢フィッシングパーク': (36.9333, 138.8050),
    '清津峡': (37.0011, 138.7850),
    '苗場ドラゴンドラ': (36.8500, 138.7167),
    '苗場スキー場': (36.8453, 138.7158),
    '神立高原スキー場': (36.9558, 138.8467),
    'GALAスキー場': (36.9472, 138.8611),
}

def add_map_button_to_card(html_content):
    """
    给每个景点卡片添加地图按钮
    """

    # 找到所有的景点卡片
    pattern = r'(<div class="dish-highlight-item"[^>]*>)(.*?)(</div>\s*<div class="highlight-content">.*?<h3 class="highlight-title">)(.*?)(</h3>)(.*?)(</div>\s*</div>)'

    def replace_card(match):
        opening_div = match.group(1)
        image_section = match.group(2)
        content_opening = match.group(3)
        title = match.group(4)
        title_close = match.group(5)
        rest_content = match.group(6)
        closing_divs = match.group(7)

        # 检查是否已经有地图按钮
        if 'map-button' in rest_content:
            return match.group(0)

        # 检查是否已经有坐标
        has_coords = 'data-lat' in opening_div

        # 获取坐标
        coords = attractions_coords.get(title, None)

        if coords and not has_coords:
            # 添加坐标到 opening div
            opening_div = opening_div.replace('>', f' data-lat="{coords[0]}" data-lng="{coords[1]}">', 1)

        if coords:
            lat, lng = coords
            # 添加地图按钮
            map_button = f'''
                        <button class="map-button" onclick="openInMap(event, {lat}, {lng}, '{title}')" title="地図で見る">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>'''

            new_content = opening_div + image_section + content_opening + title + title_close + map_button + rest_content + closing_divs
            return new_content

        return match.group(0)

    # 替换所有卡片
    result = re.sub(pattern, replace_card, html_content, flags=re.DOTALL)

    return result

# 读取文件
with open('area.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 添加地图按钮
new_html = add_map_button_to_card(html_content)

# 写回文件
with open('area.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("✅ 已成功为所有景点卡片添加地图按钮！")
