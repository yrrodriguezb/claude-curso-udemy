import pytest
from PIL import Image, ImageChops

from pixelforge.watermark import add_watermark


def test_watermark_changes_bottom_right_only():
    src = Image.new("RGB", (300, 300), (40, 40, 40))
    out = add_watermark(src)
    assert out.size == src.size and out.mode == "RGB"

    diff = ImageChops.difference(src, out).getbbox()
    assert diff is not None
    left, top, _, _ = diff
    assert left > 100 and top > 200  # cuadrante inferior derecho


def test_watermark_is_semitransparent():
    src = Image.new("RGB", (300, 300), (0, 0, 0))
    out = add_watermark(src, opacity=128)
    brightest = max(hi for _, hi in out.getextrema())
    assert 0 < brightest < 255


def test_invalid_opacity():
    with pytest.raises(ValueError):
        add_watermark(Image.new("RGB", (10, 10)), opacity=300)
