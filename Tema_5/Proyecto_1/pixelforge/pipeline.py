import logging
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from .config import Settings
from .gallery import build_gallery
from .loader import iter_images
from .thumbnail import make_thumbnail
from .vignette import apply_vignette
from .watermark import add_watermark

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProcessedImage:
    source_name: str
    output_path: Path
    relative_path: str
    original_size: tuple[int, int]
    thumb_size: tuple[int, int]


def process_image(img: Image.Image, settings: Settings) -> Image.Image:
    result = make_thumbnail(img, settings.thumb_size)
    result = apply_vignette(result, settings.vignette_strength)
    return add_watermark(result, settings.watermark_text, settings.watermark_opacity)


def _unique_name(stem: str, used: set[str]) -> str:
    name, n = f"{stem}.jpg", 1
    while name.lower() in used:
        name, n = f"{stem}_{n}.jpg", n + 1
    used.add(name.lower())
    return name


def run(settings: Settings) -> list[ProcessedImage]:
    """Procesa todas las imágenes de entrada y genera la galería."""
    settings.thumbnails_dir.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    results: list[ProcessedImage] = []

    for path, img in iter_images(settings.input_dir):
        out_name = _unique_name(path.stem, used)
        out_path = settings.thumbnails_dir / out_name
        processed = process_image(img, settings)
        processed.save(out_path, "JPEG", quality=settings.jpeg_quality, optimize=True)
        results.append(ProcessedImage(
            source_name=path.name,
            output_path=out_path,
            relative_path=f"thumbnails/{out_name}",
            original_size=img.size,
            thumb_size=processed.size,
        ))
        logger.info("Procesada %s -> %s", path.name, out_name)

    build_gallery(results, settings.output_dir)
    return results
