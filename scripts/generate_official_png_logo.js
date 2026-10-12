const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Create 800x200 crisp RGBA PNG image
const width = 800;
const height = 200;
const png = new PNG({ width, height });

// Fill white background
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    png.data[idx] = 255;     // Red
    png.data[idx + 1] = 255; // Green
    png.data[idx + 2] = 255; // Blue
    png.data[idx + 3] = 255; // Alpha
  }
}

// Helper to draw a filled rectangle
function drawRect(x0, y0, w, h, r, g, b, alpha = 255) {
  for (let y = Math.max(0, y0); y < Math.min(height, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(width, x0 + w); x++) {
      const idx = (width * Math.floor(y) + Math.floor(x)) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = alpha;
    }
  }
}

// Save PNG binary data to target paths
const targets = [
  path.join(__dirname, '../public/assets/brand/edutaktis-logo.png'),
  path.join(__dirname, '../assets/brand/edutaktis-logo.png'),
];

targets.forEach(targetPath => {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  png.pack().pipe(fs.createWriteStream(targetPath));
  console.log('Saved PNG to:', targetPath);
});
