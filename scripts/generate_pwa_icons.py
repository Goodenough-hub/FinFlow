#!/usr/bin/env python3
"""生成 PWA 图标 192/512 PNG，含 maskable 版本。"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def render(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (15, 15, 17, 255))
    px = img.load()

    # 顶到底渐变：#3B82F6 → #1D4ED8
    top = (59, 130, 246)
    bottom = (29, 78, 216)
    margin = int(size * 0.12) if maskable else 0
    radius = int(size * 0.18) if maskable else int(size * 0.22)

    # 圆角矩形区域
    x0, y0, x1, y1 = margin, margin, size - margin, size - margin
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0 - 1))
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(x0, x1):
            px[x, y] = (r, g, b, 255)

    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=radius, fill=255)
    img = Image.composite(img, Image.new("RGBA", (size, size), (15, 15, 17, 255)), mask)

    draw = ImageDraw.Draw(img, "RGBA")
    # ¥ 符号
    font_size = int(size * 0.5)
    font = ImageFont.truetype(FONT_PATH, font_size, index=0)
    text = "¥"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = int(size * 0.18) - bbox[1]
    draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))

    # 三条柱状图
    bar_w = int(size * 0.08)
    gap = int(size * 0.04)
    heights = [int(size * 0.12), int(size * 0.18), int(size * 0.24)]
    total_w = bar_w * 3 + gap * 2
    start_x = (size - total_w) // 2
    base_y = int(size * 0.78)
    for i, h in enumerate(heights):
        x = start_x + i * (bar_w + gap)
        draw.rounded_rectangle([x, base_y - h, x + bar_w, base_y], radius=bar_w // 3, fill=(255, 255, 255, 230))

    return img


for size in (192, 512):
    render(size).save(os.path.join(OUT_DIR, f"icon-{size}.png"))
    print(f"✓ icon-{size}.png")

render(512, maskable=True).save(os.path.join(OUT_DIR, "icon-512-maskable.png"))
print("✓ icon-512-maskable.png")

# favicon 1024 → 缩放成 48x48 favicon
render(1024).resize((48, 48), Image.LANCZOS).save(os.path.join(OUT_DIR, "..", "favicon.png"))
print("✓ favicon.png")
