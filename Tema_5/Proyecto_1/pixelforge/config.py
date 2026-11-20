from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = PROJECT_ROOT / "templates"
STATIC_DIR = PROJECT_ROOT / "static"

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


@dataclass(frozen=True)
class Settings:
    input_dir: Path = Path("input")
    output_dir: Path = Path("output")
    thumb_size: tuple[int, int] = (300, 300)
    vignette_strength: float = 0.6
    watermark_text: str = "© PixelForge"
    watermark_opacity: int = 128
    jpeg_quality: int = 90

    @property
    def thumbnails_dir(self) -> Path:
        return self.output_dir / "thumbnails"
