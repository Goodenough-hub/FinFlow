#!/usr/bin/env python3
"""生成 FinFlow AppIcon 1024x1024 PNG."""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 1024
OUT = os.path.join(os.path.dirname(__file__), "..", "FinFlow/Assets.xcassets/AppIcon.appiconset/AppIcon.png")

# 蓝色线性渐变背景（顶亮底深）
img = Image.new("RGB", (SIZE, SIZE), (37, 99, 235))
px = img.load()
top = (59, 130, 246)   # #3B82F6
bottom = (29, 78, 216) # #1D4ED8
for y in range(SIZE):
    t = y / (SIZE - 1)
    r = int(top[0] + (bottom[0] - top[0]) * t)
    g = int(top[1] + (bottom[1] - top[1]) * t)
    b = int(top[2] + (bottom[2] - top[2]) * t)
    for x in range(SIZE):
        px[x, y] = (r, g, b)

draw = ImageDraw.Draw(img, "RGBA")

# 字体
font_path = "/System/Library/Fonts/Hiragino Sans GB.ttc"
yen_font = ImageFont.truetype(font_path, 560, index=0)

# ¥ 符号居中偏上
text = "¥"
bbox = draw.textbbox((0, 0), text, font=yen_font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
tx = (SIZE - tw) // 2 - bbox[0]
ty = 180 - bbox[1]
draw.text((tx, ty), text, font=yen_font, fill=(255, 255, 255, 255))

# 下方上升柱状图（三条柱，递增高度）
bar_w = 90
gap = 50
total_w = bar_w * 3 + gap * 2
start_x = (SIZE - total_w) // 2
base_y = 820
heights = [120, 200, 320]
# 顶部圆角白色半透明柱
for i, h in enumerate(heights):
    x0 = start_x + i * (bar_w + gap)
    y0 = base_y - h
    x1 = x0 + bar_w
    y1 = base_y
    radius = 18
    # 圆角矩形
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=(255, 255, 255, 230))

# 上升箭头连线（细线，提示增长趋势）
# 从第一根柱顶到第三根柱顶
ax0 = start_x + bar_w // 2
ay0 = base_y - heights[0] - 10
ax2 = start_x + 2 * (bar_w + gap) + bar_w // 2
ay2 = base_y - heights[2] - 10
ax1 = start_x + (bar_w + gap) + bar_w // 2
ay1 = base_y - heights[1] - 10
draw.line([(ax0, ay0), (ax1, ay1), (ax2, ay2)], fill=(255, 255, 255, 200), width=8)
# 箭头小三角
arrow_size = 24
draw.polygon([
    (ax2, ay2 - arrow_size),
    (ax2 + arrow_size, ay2),
    (ax2 - arrow_size // 2, ay2 + arrow_size // 2),
], fill=(255, 255, 255, 220))

img.save(OUT, "PNG")
print(f"saved: {OUT}")
