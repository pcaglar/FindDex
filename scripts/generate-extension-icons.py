from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
output = root / "finddex-instagram-extension" / "icons"
font_candidates = [
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]
font_path = next((candidate for candidate in font_candidates if candidate.exists()), None)
for size in (16, 48, 128):
    image = Image.new("RGBA", (size, size), "#0f172a")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=max(3, size // 5), fill="#0f172a")
    font = ImageFont.truetype(str(font_path), max(9, int(size * .47))) if font_path else ImageFont.load_default()
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).text((size * .48, size * .55), "FD", font=font, anchor="mm", fill=255)
    gradient = Image.new("RGBA", (size, size))
    pixels = gradient.load()
    for x in range(size):
        ratio = x / max(1, size - 1)
        color = (
            int(236 + (124 - 236) * ratio),
            int(72 + (58 - 72) * ratio),
            int(153 + (237 - 153) * ratio),
            255,
        )
        for y in range(size):
            pixels[x, y] = color
    image.paste(gradient, (0, 0), mask)
    draw.ellipse((size * .76, size * .14, size * .90, size * .28), fill="#22d3ee")
    image.save(output / f"icon{size}.png")

favicon = Image.open(output / "icon128.png")
favicon.save(root / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
