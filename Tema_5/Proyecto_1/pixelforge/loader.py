import logging
from collections.abc import Iterator
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from .config import SUPPORTED_EXTENSIONS

logger = logging.getLogger(__name__)


def find_images(input_dir: Path) -> list[Path]:
    """Devuelve las rutas JPG/PNG de la carpeta, ordenadas por nombre."""
    if not input_dir.is_dir():
        raise FileNotFoundError(f"No existe la carpeta de entrada: {input_dir}")
    return sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def to_rgb(img: Image.Image) -> Image.Image:
    """Convierte a RGB; la transparencia se aplana sobre fondo blanco."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return img.convert("RGB")


def open_image(path: Path) -> Image.Image:
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        return to_rgb(img)


def iter_images(input_dir: Path) -> Iterator[tuple[Path, Image.Image]]:
    """Itera (ruta, imagen RGB) omitiendo archivos corruptos o ilegibles."""
    for path in find_images(input_dir):
        try:
            yield path, open_image(path)
        except (UnidentifiedImageError, OSError) as exc:
            logger.warning("Se omite %s: %s", path.name, exc)
