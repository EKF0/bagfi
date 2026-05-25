from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# Constants
WIDTH, HEIGHT = 2048, 2048 # High res for masterpiece quality
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
    # Create main canvas
    img = Image.new('RGBA', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Layer for effects (glow/transparency)
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # logo center
    cx, cy = WIDTH // 2, HEIGHT // 2 - 100
    
    # Draw Logo Symbol: Isometric "Bag" Core
    # We'll build a more complex geometric structure representing layered assets
    unit_w = 400
    unit_h = 100
    slant = 100
    gap = 40
    
    # Vertical spine representing the "Fi" infrastructure
    spine_x = cx - unit_w // 2 - 100
    overlay_draw.rectangle([spine_x, cy - 250, spine_x + 30, cy + 250], fill=(72, 202, 228, 255))
    
    # Top Layer (White, highest value)
    draw_parallelogram(overlay_draw, cx - unit_w//2, cy - 200, unit_w, unit_h, slant, (255, 255, 255, 240))
    
    # Middle Layer (Cyan, growth)
    draw_parallelogram(overlay_draw, cx - unit_w//2 + 50, cy - 200 + unit_h + gap, unit_w, unit_h, slant, (72, 202, 228, 200))
    
    # Bottom Layer (Cyan, foundation)
    draw_parallelogram(overlay_draw, cx - unit_w//2 + 100, cy - 200 + 2*(unit_h + gap), unit_w, unit_h, slant, (72, 202, 228, 140))

    # Add precision lines (the "blueprint" aesthetic)
    for i in range(3):
        y_pos = cy - 200 + i * (unit_h + gap)
        overlay_draw.line([(spine_x + 30, y_pos + unit_h//2), (cx - unit_w//2 + i*50, y_pos + unit_h//2)], fill=(255, 255, 255, 100), width=2)

    # Composite overlay
    img.alpha_composite(overlay)

    # Typography
    try:
        font_main = ImageFont.truetype("/Users/ekf/.agents/skills/canvas-design/canvas-fonts/Outfit-Bold.ttf", 260)
        font_sub = ImageFont.truetype("/Users/ekf/.agents/skills/canvas-design/canvas-fonts/JetBrainsMono-Regular.ttf", 48)
        font_tiny = ImageFont.truetype("/Users/ekf/.agents/skills/canvas-design/canvas-fonts/JetBrainsMono-Regular.ttf", 24)
    except:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_tiny = ImageFont.load_default()

    # Main Text
    text = "BagFi"
    bbox = draw.textbbox((0, 0), text, font=font_main)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy + 450), text, fill=WHITE, font=font_main)
    
    # Subtext
    subtext = "S O L A N A  •  A S S E T  •  L A Y E R"
    sbbox = draw.textbbox((0, 0), subtext, font=font_sub)
    sw, sh = sbbox[2] - sbbox[0], sbbox[3] - sbbox[1]
    draw.text((cx - sw//2, cy + 720), subtext, fill=(255, 255, 255, 80), font=font_sub)

    # Craftsmanship markers (Top corners)
    draw.text((100, 100), "PHILOSOPHY: MODULAR INTEGRITY", fill=(255, 255, 255, 60), font=font_tiny)
    draw.text((WIDTH - 450, 100), "SPEC: v1.0.0_PRODUCTION", fill=(72, 202, 228, 120), font=font_tiny)
    
    # Craftsmanship markers (Bottom corners)
    draw.text((100, HEIGHT - 130), "COORDINATES: 0x74...A2", fill=(255, 255, 255, 40), font=font_tiny)
    draw.text((WIDTH - 450, HEIGHT - 130), "BAGS.FM INTEGRATED", fill=(255, 255, 255, 40), font=font_tiny)

    # High-precision subtle grid
    grid_overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_overlay)
    for i in range(0, WIDTH, 256):
        grid_draw.line([(i, 0), (i, HEIGHT)], fill=(255, 255, 255, 15), width=1)
    for i in range(0, HEIGHT, 256):
        grid_draw.line([(0, i), (WIDTH, i)], fill=(255, 255, 255, 15), width=1)
    
    img.alpha_composite(grid_overlay)

    # Final Save
    img.save('bagfi_logo_masterpiece.png')

generate()
