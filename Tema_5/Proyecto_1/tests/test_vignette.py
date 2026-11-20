import pytest
from PIL import Image

from pixelforge.vignette import apply_vignette


def _lum(img, xy):
    return sum(img.getpixel(xy)) / 3


def test_corners_darker_than_center():
    img = apply_vignette(Image.new("RGB", (300, 300), (200, 200, 200)), 0.6)
    center = _lum(img, (150, 150))
    for corner in [(0, 0), (299, 0), (0, 299), (299, 299)]:
        assert _lum(img, corner) < center - 50
    assert center > 190


def test_zero_strength_is_noop():
    src = Image.new("RGB", (100, 100), (123, 45, 67))
    assert apply_vignette(src, 0).tobytes() == src.tobytes()


def test_invalid_strength():
    with pytest.raises(ValueError):
        apply_vignette(Image.new("RGB", (10, 10)), 1.5)
