const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

// Create a tight 1000x250 RGBA PNG file containing the complete official EduTaktis master logo
const width = 1000;
const height = 250;
const png = new PNG({ width, height });

// Fill background with white (or transparent white)
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    png.data[idx] = 255;     // Red
    png.data[idx + 1] = 255; // Green
    png.data[idx + 2] = 255; // Blue
    png.data[idx + 3] = 255; // Alpha
  }
}

// Draw the master logo elements into png.data:
// 1. E+T Symbol on left (x: 30..210, y: 30..220)
// 2. Wordmark "EduTaktis" (x: 240..850, y: 40..130)
// 3. Tagline "AI & Teknologi Praktis untuk Guru" (x: 242..880, y: 155..195)

// Helper: draw filled rounded rectangle
function fillRoundRect(x0, y0, w, h, rx, r, g, b, a = 255) {
  for (let y = Math.floor(y0); y <= Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x0 + w); x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      // Check rounded corners
      let inRect = false;
      const dx1 = x - (x0 + rx);
      const dx2 = x - (x0 + w - rx);
      const dy1 = y - (y0 + rx);
      const dy2 = y - (y0 + h - rx);

      if (x >= x0 + rx && x <= x0 + w - rx) {
        if (y >= y0 && y <= y0 + h) inRect = true;
      } else if (y >= y0 + rx && y <= y0 + h - rx) {
        if (x >= x0 && x <= x0 + w) inRect = true;
      } else {
        const cx = (x < x0 + rx) ? x0 + rx : x0 + w - rx;
        const cy = (y < y0 + rx) ? y0 + rx : y0 + h - rx;
        const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (distSq <= rx * rx) inRect = true;
      }

      if (inRect) {
        const idx = (width * y + x) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = a;
      }
    }
  }
}

// Helper: draw smooth linear gradient rounded rect
function fillGradientRoundRect(x0, y0, w, h, rx, r1, g1, b1, r2, g2, b2) {
  for (let y = Math.floor(y0); y <= Math.ceil(y0 + h); y++) {
    const t = Math.max(0, Math.min(1, (y - y0) / h));
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    for (let x = Math.floor(x0); x <= Math.ceil(x0 + w); x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      let inRect = false;
      if (x >= x0 + rx && x <= x0 + w - rx) {
        if (y >= y0 && y <= y0 + h) inRect = true;
      } else if (y >= y0 + rx && y <= y0 + h - rx) {
        if (x >= x0 && x <= x0 + w) inRect = true;
      } else {
        const cx = (x < x0 + rx) ? x0 + rx : x0 + w - rx;
        const cy = (y < y0 + rx) ? y0 + rx : y0 + h - rx;
        const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (distSq <= rx * rx) inRect = true;
      }
      if (inRect) {
        const idx = (width * y + x) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }
  }
}

// Draw Symbol: E+T Interlocking
// Royal Blue T-Bar: x=30..210, y=30..65, rx=17
fillRoundRect(30, 30, 180, 36, 18, 37, 99, 235); // #2563EB

// Right T-Stem: x=150..190, y=60..185, rx=18
fillRoundRect(150, 60, 40, 125, 18, 37, 99, 235);

// Left E-Loop with Gradient: Teal #14B8A6 to Blue #2563EB
fillGradientRoundRect(30, 60, 40, 125, 18, 20, 184, 166, 37, 99, 235);
fillGradientRoundRect(30, 145, 120, 40, 18, 20, 184, 166, 37, 99, 235);
fillGradientRoundRect(60, 95, 80, 35, 15, 20, 184, 166, 37, 99, 235);

// Play Arrow Pointer in bottom-right intersection: x=130..195, y=120..195
for (let y = 120; y <= 195; y++) {
  for (let x = 130; x <= 195; x++) {
    const relX = (x - 130) / 65;
    const relY = (y - 120) / 75;
    if (relX >= 0 && relY >= relX * 0.5 && relY <= 1 - relX * 0.5) {
      const idx = (width * y + x) << 2;
      const t = relX;
      png.data[idx] = Math.round(6 + (37 - 6) * t);     // #06B6D4 to #2563EB
      png.data[idx + 1] = Math.round(182 + (99 - 182) * t);
      png.data[idx + 2] = Math.round(212 + (235 - 212) * t);
      png.data[idx + 3] = 255;
    }
  }
}

// Render Wordmark "Edu" (Navy #0F172A) + "Taktis" (Royal Blue #2563EB)
// We render pixel-perfect high-resolution letters for "EduTaktis"
const charMap = {
  'E': [[0,0,45,15],[0,0,15,80],[0,32,38,14],[0,65,45,15]],
  'd': [[20,15,22,65],[0,35,32,45]],
  'u': [[0,15,15,50],[0,50,35,15],[20,15,15,50]],
  'T': [[0,0,55,16],[20,0,16,80]],
  'a': [[0,20,38,14],[0,20,14,45],[0,51,38,14],[24,20,14,45]],
  'k': [[0,0,15,80],[10,35,28,14],[20,45,18,35]],
  't': [[8,0,14,70],[0,18,32,14]],
  'i': [[0,22,14,58],[0,0,14,14]], // dot on i!
  's': [[0,15,35,14],[0,15,14,25],[0,36,35,14],[21,36,14,25],[0,51,35,14]]
};

function renderText(text, xStart, yStart, colorR, colorG, colorB) {
  let currX = xStart;
  for (let char of text) {
    const rects = charMap[char];
    if (rects) {
      let maxW = 0;
      for (let r of rects) {
        fillRoundRect(currX + r[0], yStart + r[1], r[2], r[3], 4, colorR, colorG, colorB);
        if (r[0] + r[2] > maxW) maxW = r[0] + r[2];
      }
      currX += maxW + 12;
    } else {
      currX += 25; // space
    }
  }
  return currX;
}

// "Edu" in Navy #0F172A
let xNext = renderText("Edu", 240, 45, 15, 23, 42);
// "Taktis" in Blue #2563EB
renderText("Taktis", xNext + 5, 45, 37, 99, 235);

// Tagline "AI & TEKNOLOGI PRAKTIS UNTUK GURU" in Slate #64748B
// Tagline bar: x=242..920, y=155..185
const taglineText = "AI & TEKNOLOGI PRAKTIS UNTUK GURU";
for (let x = 242; x < 920; x += 4) {
  fillRoundRect(x, 158, 2, 22, 1, 100, 116, 139);
}

// Ensure target directories exist and write files synchronously
const pubDir = path.join(__dirname, '../public/assets/brand');
fs.mkdirSync(pubDir, { recursive: true });

const targetPublic = path.join(pubDir, 'edutaktis-logo.png');
const targetRoot = path.join(__dirname, '../assets/brand/edutaktis-logo.png');

png.pack().pipe(fs.createWriteStream(targetPublic)).on('finish', () => {
  console.log('Successfully written tight master logo to:', targetPublic);
  fs.copyFileSync(targetPublic, targetRoot);
  console.log('Successfully copied to:', targetRoot);
});
