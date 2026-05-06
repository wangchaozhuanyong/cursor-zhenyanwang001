from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random

OUT = Path("artifacts/webp-products")
OUT.mkdir(parents=True, exist_ok=True)

PALETTES = [
    ((16, 24, 40), (57, 97, 183), (237, 197, 94)),
    ((30, 30, 30), (188, 81, 79), (244, 213, 141)),
    ((24, 47, 57), (74, 140, 130), (238, 224, 201)),
    ((36, 28, 59), (104, 93, 183), (225, 185, 255)),
]

def make_asset(idx: int):
    w, h = 1280, 1280
    bg, accent, light = random.choice(PALETTES)
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)

    for i in range(8):
        x0 = random.randint(-150, w - 200)
        y0 = random.randint(-150, h - 200)
        x1 = x0 + random.randint(220, 520)
        y1 = y0 + random.randint(220, 520)
        col = (
            min(255, accent[0] + random.randint(-20, 30)),
            min(255, accent[1] + random.randint(-20, 30)),
            min(255, accent[2] + random.randint(-20, 30)),
        )
        d.ellipse([x0, y0, x1, y1], fill=col)

    card = (150, 170, 1130, 1110)
    d.rounded_rectangle(card, radius=48, fill=(245, 245, 245), outline=light, width=6)
    d.rounded_rectangle((250, 270, 1030, 790), radius=28, fill=(235, 238, 242))

    d.rectangle((330, 365, 950, 395), fill=accent)
    d.rectangle((330, 430, 900, 455), fill=(120, 120, 120))
    d.rectangle((330, 485, 820, 510), fill=(140, 140, 140))

    d.rounded_rectangle((330, 855, 610, 940), radius=20, fill=(255, 236, 170))
    d.rounded_rectangle((640, 855, 950, 940), radius=20, fill=(220, 230, 255))

    try:
        font_big = ImageFont.truetype("arial.ttf", 54)
        font_small = ImageFont.truetype("arial.ttf", 36)
    except Exception:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()

    d.text((345, 870), f"RM {79 + idx}", font=font_big, fill=(30, 30, 30))
    d.text((655, 872), "In Stock", font=font_small, fill=(45, 70, 130))
    d.text((345, 300), f"Product {idx:02d}", font=font_big, fill=(25, 25, 25))

    out = OUT / f"product-{idx:02d}.webp"
    im.save(out, "WEBP", quality=92, method=6)

def main():
    for i in range(1, 25):
        make_asset(i)
    print(OUT.resolve())

if __name__ == "__main__":
    main()

