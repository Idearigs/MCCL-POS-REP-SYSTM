# PWA Icon Setup Guide

## Quick Start

Your MCCL POS app needs PWA icons to be fully installable. Follow these steps to create them.

## Required Icons

Place these files in the `public/` directory:

1. **pwa-192x192.png** - 192×192px standard icon
2. **pwa-512x512.png** - 512×512px standard icon
3. **pwa-maskable-192x192.png** - 192×192px Android adaptive icon
4. **pwa-maskable-512x512.png** - 512×512px Android adaptive icon

## Option 1: Use Online Generator (Easiest)

### Step 1: Create Your Base Icon

1. Design a 512×512px PNG with your MCCL logo
2. Use solid background (suggested: #1e3a5f - navy blue)
3. Logo should have padding (minimum 10% on all sides)

### Step 2: Generate PWA Icons

Visit: **https://www.pwabuilder.com/imageGenerator**

1. Upload your 512×512px icon
2. Click "Generate Icons"
3. Download the generated icons
4. Rename them to match the required filenames above
5. Copy to `public/` directory

## Option 2: Use Maskable Icon Editor (Best for Android)

### Create Maskable Icons

Visit: **https://maskable.app/editor**

1. Upload your logo
2. Adjust position to fit safe zone (white circle)
3. Add background color (#1e3a5f recommended)
4. Export as 512×512px
5. Save as `pwa-maskable-512x512.png`
6. Resize to 192×192px in image editor
7. Save as `pwa-maskable-192x192.png`

### Create Standard Icons

For standard icons, you can use the same images:
```bash
cp public/pwa-maskable-512x512.png public/pwa-512x512.png
cp public/pwa-maskable-192x192.png public/pwa-192x192.png
```

## Option 3: Manual Creation

### Using Design Software (Photoshop, Figma, etc.)

#### Standard Icons

1. Create 512×512px canvas
2. Background: Navy blue (#1e3a5f)
3. Add MCCL logo centered
4. Ensure 10-15% padding on all sides
5. Export as `pwa-512x512.png`

6. Resize to 192×192px
7. Export as `pwa-192x192.png`

#### Maskable Icons (Android)

1. Create 512×512px canvas
2. Background: Navy blue (#1e3a5f) - full bleed
3. Add MCCL logo in **safe zone** (center 80% of canvas)
4. Safe zone = 410×410px area in center
5. Logo must be visible even when cropped to circle
6. Export as `pwa-maskable-512x512.png`

7. Resize to 192×192px
8. Export as `pwa-maskable-192x192.png`

### Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Create a simple placeholder icon (for testing)
convert -size 512x512 xc:#1e3a5f \
  -gravity center \
  -pointsize 120 \
  -fill white \
  -font Arial-Bold \
  -annotate +0-20 "MCCL" \
  -pointsize 80 \
  -annotate +0+60 "POS" \
  public/pwa-512x512.png

# Resize to 192x192
convert public/pwa-512x512.png -resize 192x192 public/pwa-192x192.png

# Copy for maskable versions
cp public/pwa-512x512.png public/pwa-maskable-512x512.png
cp public/pwa-192x192.png public/pwa-maskable-192x192.png
```

## Icon Design Guidelines

### Standard Icons

- **Format**: PNG with transparency (or solid background)
- **Size**: 512×512px and 192×192px
- **Padding**: 10-15% minimum on all sides
- **Logo**: Centered, clear, recognizable
- **Background**: Solid color or subtle gradient (avoid transparency)

### Maskable Icons (Android Adaptive)

- **Format**: PNG (no transparency in corners)
- **Size**: 512×512px and 192×192px
- **Safe Zone**: Logo must fit in center 80% (410×410px)
- **Background**: Full bleed, solid color
- **Logo**: Centered in safe zone
- **Test**: Must look good when cropped to circle

### Colors (Suggested)

- **Background**: #1e3a5f (Navy - matches theme)
- **Logo**: #d4af37 (Gold - matches theme)
- **Alternative Background**: #ffffff (White)
- **Alternative Logo**: #1e3a5f (Navy)

## Screenshots (Optional but Recommended)

For better app store presentation:

### Desktop Screenshot
- **Size**: 1280×720px
- **File**: `public/screenshot-wide.png`
- **Content**: Main dashboard or POS screen

### Mobile Screenshot
- **Size**: 750×1334px
- **File**: `public/screenshot-narrow.png`
- **Content**: Mobile view of POS or inventory

## Testing Your Icons

### 1. Visual Check

Place icons in `public/` and open:
```
http://localhost:8080/pwa-192x192.png
http://localhost:8080/pwa-512x512.png
http://localhost:8080/pwa-maskable-192x192.png
http://localhost:8080/pwa-maskable-512x512.png
```

### 2. DevTools Check

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Manifest** in sidebar
4. Check if icons appear correctly
5. Look for any errors

### 3. Maskable Icon Test

Visit: https://maskable.app/

1. Upload your `pwa-maskable-512x512.png`
2. Toggle through different shapes
3. Ensure logo is visible in all shapes
4. Adjust and re-export if needed

## Quick Template Icons

Need to test quickly? Use these free icon generators:

1. **Favicon.io** - https://favicon.io/favicon-generator/
2. **IconKitchen** - https://icon.kitchen/
3. **PWA Builder** - https://www.pwabuilder.com/imageGenerator

## Common Mistakes to Avoid

❌ **Icon too small** - Logo too small, hard to recognize
✅ **Right size** - Logo clear and recognizable

❌ **No padding** - Logo touches edges
✅ **Proper padding** - 10-15% padding on all sides

❌ **Transparency on maskable** - Corners transparent
✅ **Solid background** - Full background color

❌ **Logo outside safe zone** - Gets cropped on Android
✅ **Logo in safe zone** - Fits 80% center area

❌ **Low resolution** - Pixelated icon
✅ **High resolution** - Crisp 512×512px

## Current Status

After adding icons, verify by building:

```bash
npm run build
npm run preview
```

Then check:
1. Chrome DevTools > Application > Manifest
2. Look for install icon in address bar
3. Test installation

## Need Help?

If icons aren't showing:

1. **Clear cache**: DevTools > Application > Clear storage
2. **Hard reload**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. **Check paths**: Ensure files are in `public/` directory
4. **Check names**: Must match exactly (case-sensitive)
5. **Check format**: Must be PNG
6. **Check size**: Must be exact dimensions

## Resources

- **PWA Builder**: https://www.pwabuilder.com/imageGenerator
- **Maskable App**: https://maskable.app/editor
- **Favicon Generator**: https://realfavicongenerator.net/
- **Icon Kitchen**: https://icon.kitchen/
- **Google PWA Icons Guide**: https://web.dev/add-manifest/

---

**Note**: Once you add the icons, your PWA will be fully functional and installable on all platforms!
