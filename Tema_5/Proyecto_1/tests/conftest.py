import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def solid_image() -> Image.Image:
    return Image.new("RGB", (800, 600), (200, 200, 200))


@pytest.fixture
def input_dir(tmp_path: Path) -> Path:
    d = tmp_path / "input"
    d.mkdir()
    Image.new("RGB", (640, 480), (180, 120, 60)).save(d / "paisaje.jpg")
    Image.new("RGBA", (400, 900), (30, 90, 200, 128)).save(d / "retrato.png")
    Image.new("RGB", (500, 500), (10, 200, 10)).save(d / "paisaje.png")  # mismo stem
    (d / "corrupta.jpg").write_bytes(b"no soy una imagen")
    (d / "notas.txt").write_text("ignorar")
    return d
