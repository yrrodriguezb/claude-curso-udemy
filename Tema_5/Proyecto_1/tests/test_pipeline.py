import pytest
from PIL import Image

from pixelforge.config import Settings
from pixelforge.pipeline import run


def test_pipeline_end_to_end(input_dir, tmp_path):
    out = tmp_path / "output"
    results = run(Settings(input_dir=input_dir, output_dir=out))

    # 3 válidas; corrupta.jpg y notas.txt omitidas
    assert len(results) == 3
    names = sorted(p.output_path.name for p in results)
    assert names == ["paisaje.jpg", "paisaje_1.jpg", "retrato.jpg"]

    for item in results:
        with Image.open(item.output_path) as img:
            assert max(img.size) == 300
            assert img.size == item.thumb_size

    html = (out / "index.html").read_text(encoding="utf-8")
    assert html.count("<img ") == 3
    assert "3 imágenes procesadas" in html
    assert (out / "gallery.css").exists()


def test_pipeline_empty_input(tmp_path):
    (tmp_path / "in").mkdir()
    results = run(Settings(input_dir=tmp_path / "in", output_dir=tmp_path / "out"))
    assert results == []
    assert "No se encontraron" in (tmp_path / "out" / "index.html").read_text(encoding="utf-8")


def test_pipeline_missing_input(tmp_path):
    with pytest.raises(FileNotFoundError):
        run(Settings(input_dir=tmp_path / "nope", output_dir=tmp_path / "out"))
