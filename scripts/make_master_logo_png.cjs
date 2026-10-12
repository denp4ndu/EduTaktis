const fs = require('fs');
const PNG = require('pngjs').PNG;

// Create 1000x250 PNG image canvas
const width = 1000;
const height = 250;
const png = new PNG({ width, height });

// Fill background with white
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    png.data[idx] = 255;     // Red
    png.data[idx + 1] = 255; // Green
    png.data[idx + 2] = 255; // Blue
    png.data[idx + 3] = 255; // Alpha
  }
}

// Draw Pixel Helper
function fillRect(x0, y0, w, h, r, g, b, radius = 0) {
  const x1 = Math.min(width, Math.max(0, x0 + w));
  const y1 = Math.min(height, Math.max(0, y0 + h));
  const rx = Math.max(0, x0);
  const ry = Math.max(0, y0);

  for (let y = ry; y < y1; y++) {
    for (let x = rx; x < x1; x++) {
      let draw = true;
      if (radius > 0) {
        // Rounded corner check
        let dx = 0, dy = 0;
        if (x < x0 + radius) dx = x0 + radius - x;
        else if (x > x0 + w - radius) dx = x - (x0 + w - radius);
        if (y < y0 + radius) dy = y0 + radius - y;
        else if (y > y0 + h - radius) dy = y - (y0 + h - radius);

        if (dx > 0 && dy > 0 && (dx * dx + dy * dy > radius * radius)) {
          draw = false;
        }
      }

      if (draw) {
        const idx = (width * Math.floor(y) + Math.floor(x)) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }
  }
}

// Draw Right-Facing Pointer Arrow
function fillTriangle(p1, p2, p3, r, g, b) {
  const minX = Math.max(0, Math.floor(Math.min(p1[0], p2[0], p3[0])));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(p1[0], p2[0], p3[0])));
  const minY = Math.max(0, Math.floor(Math.min(p1[1], p2[1], p3[1])));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(p1[1], p2[1], p3[1])));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d1 = (x - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (y - p2[1]);
      const d2 = (x - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (y - p3[1]);
      const d3 = (x - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (y - p1[1]);

      const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

      if (!(has_neg && has_pos)) {
        const idx = (width * y + x) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }
  }
}

// 1. Draw E+T Symbol
// Top T Bar (Royal Blue #2563EB)
fillRect(30, 30, 160, 36, 37, 99, 235, 18);

// Right T Stem (Royal Blue #2563EB)
fillRect(144, 56, 36, 124, 37, 99, 235, 18);

// Left E Stem & Loop (EduTaktis Teal #14B8A6)
fillRect(30, 56, 36, 124, 20, 184, 166, 18);
fillRect(30, 144, 110, 36, 20, 184, 166, 18);
fillRect(60, 84, 70, 32, 20, 184, 166, 16);

// Bottom-Right Play Arrow Pointer (Gradient Cyan #06B6D4)
fillTriangle([130, 110], [185, 142], [130, 174], 6, 182, 212);

// Write PNG to file
const buffer = PNG.sync.write(png);
fs.writeFileSync('/app/applet/public/assets/brand/edutaktis-logo.png', buffer);
fs.writeFileSync('/app/applet/assets/brand/edutaktis-logo.png', buffer);

console.log('Successfully generated master logo PNG at /public/assets/brand/edutaktis-logo.png');
