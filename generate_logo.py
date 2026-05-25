from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# Constants
WIDTH, HEIGHT = 1024, 1024
BG_COLOR = (11, 19, 43)  # #0B132B
ACCENT_COLOR = (72, 202, 228)  # #48CAE4
WHITE = (255, 255, 255)

def draw_parallelogram(draw, x, y, w, h, slant, color):
    points = [
        (x, y),
        (x + w, y),
        (x + w + slant, y + h),
        (x + slant, y + h)
    ]
    draw.polygon(points, fill=color)

def generate():
    img = Image.new('RGBA', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # logo center
    cx, cy = WIDTH // 2, HEIGHT // 2 - 50
    
    # Draw Logo Symbol: Stacked "Modular Units" forming a stylized B/Layer
    unit_w = 180
    unit_h = 60
    slant = 40
    gap = 20
    
    # Layer 1 (Top) - High Opacity White
    draw_parallelogram(draw, cx - unit_w//2 - 20, cy - 100, unit_w, unit_h, slant, (255, 255, 255, 255))
    
    # Layer 2 (Middle) - Cyan
    draw_parallelogram(draw, cx - unit_w//2, cy - 100 + unit_h + gap, unit_w, unit_h, slant, (72, 202, 228, 255))
    
    # Layer 3 (Bottom) - Cyan Lower Opacity
    draw_parallelogram(draw, cx - unit_w//2 + 20, cy - 100 + 2*(unit_h + gap), unit_w, unit_h, slant, (72, 202, 228, 180))
    
    # Vertical "Core" bar
    draw.rectangle([cx - unit_w//2 - 40, cy - 100, cx - unit_w//2 - 10, cy + 100], fill=ACCENT_COLOR)

    # Add text
    try:
        # Try to find a font in the provided directory or system
        font_path = "/Users/ekf/.agents/skills/canvas-design/canvas-fonts/Outfit-Bold.ttf"
        font = ImageFont.truetype(font_path, 120)
        font_sub = ImageFont.truetype("/Users/ekf/.agents/skills/canvas-design/canvas-fonts/JetBrainsMono-Regular.ttf", 32)
    except:
        font = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text = "BagFi"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy + 200), text, fill=WHITE, font=font)
    
    subtext = "UNIFIED ASSET LAYER"
    sbbox = draw.textbbox((0, 0), subtext, font=font_sub)
    sw, sh = sbbox[2] - sbbox[0], sbbox[3] - sbbox[1]
    
    # Spacing dots for subtext
    spaced_subtext = " • ".join(list(subtext.replace(" ", "")))
    draw.text((cx - sw//2, cy + 330), subtext, fill=(255, 255, 255, 100), font=font_sub)

    # Systematic markers (the "craftsmanship" detail)
    marker_font = ImageFont.load_default()
    draw.text((50, 50), "REF: MOD_INT_01", fill=(255, 255, 255, 50))
    draw.text((WIDTH - 200, 50), "STATUS: MAINNET_READY", fill=(72, 202, 228, 100))
    draw.text((50, HEIGHT - 70), "COORDINATES: 12.4 / 48.2 / 0B", fill=(255, 255, 255, 50))
    
    # Grid lines
    for i in range(0, WIDTH, 128):
        draw.line([(i, 0), (i, HEIGHT)], fill=(255, 255, 255, 10), width=1)
    for i in range(0, HEIGHT, 128):
        draw.line([(0, i), (WIDTH, i)], fill=(255, 255, 255, 10), width=1)

    img.save('bagfi_logo.png')

generate()
