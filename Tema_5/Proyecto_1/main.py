import argparse
import logging
import sys
from pathlib import Path

from pixelforge.config import Settings
from pixelforge.pipeline import run


def parse_args(argv: list[str] | None = None) -> Settings:
    parser = argparse.ArgumentParser(description="PixelForge: thumbnails + viñeta + watermark + galería")
    parser.add_argument("--input", type=Path, default=Path("input"), help="Carpeta de imágenes fuente")
    parser.add_argument("--output", type=Path, default=Path("output"), help="Carpeta de salida")
    parser.add_argument("--strength", type=float, default=0.6, help="Intensidad de la viñeta (0-1)")
    parser.add_argument("--opacity", type=int, default=128, help="Opacidad del watermark (0-255)")
    args = parser.parse_args(argv)
    return Settings(
        input_dir=args.input,
        output_dir=args.output,
        vignette_strength=args.strength,
        watermark_opacity=args.opacity,
    )


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    settings = parse_args(argv)
    try:
        results = run(settings)
    except (FileNotFoundError, ValueError) as exc:
        logging.error("%s", exc)
        return 1
    logging.info("Listo: %d imágenes -> %s", len(results), settings.output_dir / "index.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
