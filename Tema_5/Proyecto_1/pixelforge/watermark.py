from PIL import Image, ImageDraw, ImageFont

_FONT_CANDIDATES = ("arial.ttf", "DejaVuSans.ttf", "Helvetica.ttc")


def _load_font(size: int) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    for name in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def add_watermark(
    img: Image.Image,
    text: str = "© PixelForge",
    opacity: int = 128,
    margin_ratio: float = 0.04,
) -> Image.Image:
    """Añade `text` semitransparente en la esquina inferior derecha."""
    if not 0 <= opacity <= 255:
        raise ValueError("opacity debe estar entre 0 y 255")

    base = img.convert("RGBA")
    layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(layer)

    font = _load_font(max(10, max(base.size) // 14))
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    margin = round(min(base.size) * margin_ratio)
    x = base.width - (right - left) - margin - left
    y = base.height - (bottom - top) - margin - top

    # Sombra sutil para legibilidad sobre fondos claros.
    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, opacity // 2))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, opacity))

    return Image.alpha_composite(base, layer).convert("RGB")
