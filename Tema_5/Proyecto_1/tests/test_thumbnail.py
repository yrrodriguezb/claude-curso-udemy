from PIL import Image

from pixelforge.thumbnail import make_thumbnail


def test_landscape_keeps_aspect_ratio(solid_image):
    # 800x600 (4:3) -> 300x225
    assert make_thumbnail(solid_image).size == (300, 225)


def test_portrait_keeps_aspect_ratio():
    assert make_thumbnail(Image.new("RGB", (400, 900))).size == (133, 300)


def test_small_images_are_not_upscaled():
    assert make_thumbnail(Image.new("RGB", (50, 120))).size == (50, 120)


def test_source_is_not_modified(solid_image):
    make_thumbnail(solid_image)
    assert solid_image.size == (800, 600)
