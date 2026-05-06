from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random

OUT = Path("artifacts/webp-products-v2")
OUT.mkdir(parents=True, exist_ok=True)

CATS = [
    ("digital", (24, 36, 64), (86, 136, 255), (218, 236, 255)),
    ("home", (46, 38, 30), (196, 146, 92), (255, 241, 224)),
    ("fashion", (52, 26, 52), (196, 96, 180), (255, 228, 250)),
    ("food", (30, 56, 34), (108, 174, 96), (230, 255, 223)),
    ("outdoor", (22, 44, 48), (72, 176, 168), (221, 252, 246)),
]

def text_fonts():
    try:
        return (
            ImageFont.truetype("arial.ttf", 62),
            ImageFont.truetype("arial.ttf", 34),
            ImageFont.truetype("arial.ttf", 28),
        )
    except Exception:
        f = ImageFont.load_default()
        return (f, f, f)

F_BIG, F_MID, F_SMALL = text_fonts()

def draw_item(d, cat, area, accent, light):
    x0, y0, x1, y1 = area
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    w = x1 - x0
    h = y1 - y0
    if cat == "digital":
        d.rounded_rectangle((cx - w*0.28, cy - h*0.2, cx + w*0.28, cy + h*0.16), radius=38, fill=(35, 48, 76))
        d.rounded_rectangle((cx - w*0.2, cy - h*0.12, cx + w*0.2, cy + h*0.1), radius=24, fill=light)
        d.ellipse((cx - 20, cy + h*0.18, cx + 20, cy + h*0.26), fill=accent)
    elif cat == "home":
        d.rounded_rectangle((cx - w*0.2, cy - h*0.22, cx + w*0.2, cy + h*0.2), radius=30, fill=(230, 230, 230), outline=accent, width=6)
        d.rounded_rectangle((cx - w*0.16, cy - h*0.26, cx + w*0.16, cy - h*0.22), radius=12, fill=accent)
        d.rectangle((cx - w*0.06, cy + h*0.2, cx + w*0.06, cy + h*0.24), fill=accent)
    elif cat == "fashion":
        d.polygon([(cx, cy-h*0.26), (cx-w*0.18, cy-h*0.02), (cx-w*0.12, cy+h*0.24), (cx+w*0.12, cy+h*0.24), (cx+w*0.18, cy-h*0.02)], fill=accent)
        d.ellipse((cx - w*0.1, cy - h*0.3, cx + w*0.1, cy - h*0.18), outline=light, width=8)
    elif cat == "food":
        d.ellipse((cx - w*0.22, cy - h*0.14, cx + w*0.22, cy + h*0.18), fill=accent)
        d.rectangle((cx - w*0.06, cy - h*0.28, cx + w*0.06, cy - h*0.12), fill=(245, 245, 245))
        d.rectangle((cx - w*0.09, cy - h*0.32, cx + w*0.09, cy - h*0.28), fill=light)
    else:
        d.rounded_rectangle((cx - w*0.2, cy - h*0.2, cx + w*0.2, cy + h*0.18), radius=24, fill=accent)
        d.polygon([(cx-w*0.22, cy-h*0.04), (cx-w*0.32, cy+h*0.02), (cx-w*0.22, cy+h*0.08)], fill=light)
        d.polygon([(cx+w*0.22, cy-h*0.04), (cx+w*0.32, cy+h*0.02), (cx+w*0.22, cy+h*0.08)], fill=light)

def make_asset(idx, cat, bg, accent, light):
    w, h = 1280, 1280
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)

    for i in range(10):
        xx = random.randint(-120, w - 120)
        yy = random.randint(-120, h - 120)
        rr = random.randint(90, 230)
        col = (
            max(0, min(255, accent[0] + random.randint(-25, 25))),
            max(0, min(255, accent[1] + random.randint(-25, 25))),
            max(0, min(255, accent[2] + random.randint(-25, 25))),
        )
        d.ellipse((xx, yy, xx + rr, yy + rr), fill=col)

    card = (120, 120, 1160, 1160)
    d.rounded_rectangle(card, radius=56, fill=(248, 248, 248), outline=(220, 220, 220), width=5)

    hero = (220, 240, 1060, 800)
    d.rounded_rectangle(hero, radius=36, fill=(236, 239, 243))
    draw_item(d, cat, hero, accent, light)

    d.text((250, 860), f"{cat.upper()} SERIES {idx:02d}", fill=(26, 26, 26), font=F_BIG)
    d.text((250, 940), "Premium quality - test catalog asset", fill=(96, 96, 96), font=F_MID)

    price = 59 + idx * 7
    d.rounded_rectangle((250, 1015, 510, 1095), radius=20, fill=(255, 233, 178))
    d.text((272, 1033), f"RM {price}", fill=(22, 22, 22), font=F_MID)

    d.rounded_rectangle((540, 1015, 940, 1095), radius=20, fill=(226, 240, 255))
    d.text((566, 1033), "In stock / Fast ship", fill=(36, 70, 122), font=F_SMALL)

    im = im.filter(ImageFilter.SMOOTH_MORE)
    out = OUT / f"{cat}-{idx:02d}.webp"
    im.save(out, "WEBP", quality=93, method=6)

def main():
    idx = 1
    for cat, bg, accent, light in CATS:
        for _ in range(10):
            make_asset(idx, cat, bg, accent, light)
            idx += 1
    print(OUT.resolve())

if __name__ == "__main__":
    main()

