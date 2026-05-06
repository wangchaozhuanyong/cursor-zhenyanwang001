from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path("artifacts/home-banners-webp")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 750, 330

BANNERS = [
    {
        "name": "home-banner-01.webp",
        "title": "FLASH SALE",
        "subtitle": "Up to 50% OFF",
        "bg1": (22, 58, 130),
        "bg2": (53, 124, 242),
        "accent": (255, 211, 79),
    },
    {
        "name": "home-banner-02.webp",
        "title": "NEW ARRIVALS",
        "subtitle": "Fresh picks this week",
        "bg1": (54, 34, 88),
        "bg2": (194, 104, 226),
        "accent": (255, 222, 238),
    },
    {
        "name": "home-banner-03.webp",
        "title": "HOME ESSENTIALS",
        "subtitle": "Daily life upgrades",
        "bg1": (18, 95, 74),
        "bg2": (52, 186, 143),
        "accent": (232, 255, 186),
    },
]


def pick_fonts():
    try:
        return (
            ImageFont.truetype("arial.ttf", 58),
            ImageFont.truetype("arial.ttf", 28),
            ImageFont.truetype("arial.ttf", 22),
        )
    except Exception:
        f = ImageFont.load_default()
        return (f, f, f)


TITLE_FONT, SUB_FONT, CTA_FONT = pick_fonts()


def make_gradient(bg1, bg2):
    im = Image.new("RGB", (W, H), bg1)
    px = im.load()
    for y in range(H):
        t = y / max(H - 1, 1)
        r = int(bg1[0] * (1 - t) + bg2[0] * t)
        g = int(bg1[1] * (1 - t) + bg2[1] * t)
        b = int(bg1[2] * (1 - t) + bg2[2] * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return im


def draw_banner(meta):
    im = make_gradient(meta["bg1"], meta["bg2"])
    d = ImageDraw.Draw(im)

    # Soft bubbles for visual depth
    for i in range(7):
        x = 430 + i * 45
        y = 40 + (i % 3) * 70
        r = 58 + (i % 4) * 12
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 24))

    # Product-like cards on right side
    d.rounded_rectangle((460, 52, 575, 280), radius=20, fill=(248, 248, 248), outline=(229, 229, 229), width=2)
    d.rounded_rectangle((592, 72, 710, 300), radius=20, fill=(241, 241, 241), outline=(229, 229, 229), width=2)
    d.rounded_rectangle((476, 70, 560, 168), radius=14, fill=meta["accent"])
    d.rounded_rectangle((608, 92, 694, 190), radius=14, fill=meta["accent"])
    d.rectangle((486, 182, 550, 190), fill=(180, 180, 180))
    d.rectangle((618, 204, 684, 212), fill=(180, 180, 180))

    d.text((34, 76), meta["title"], font=TITLE_FONT, fill=(255, 255, 255))
    d.text((36, 156), meta["subtitle"], font=SUB_FONT, fill=(236, 242, 255))

    d.rounded_rectangle((36, 210, 196, 262), radius=14, fill=(255, 255, 255))
    d.text((58, 224), "Shop Now", font=CTA_FONT, fill=(36, 36, 36))

    d.rounded_rectangle((220, 210, 410, 262), radius=14, fill=(255, 211, 79))
    d.text((240, 224), "Limited Offer", font=CTA_FONT, fill=(28, 28, 28))

    im = im.filter(ImageFilter.SMOOTH)
    out = OUT / meta["name"]
    im.save(out, "WEBP", quality=92, method=6)


def main():
    for item in BANNERS:
        draw_banner(item)
    print(str(OUT.resolve()))


if __name__ == "__main__":
    main()

