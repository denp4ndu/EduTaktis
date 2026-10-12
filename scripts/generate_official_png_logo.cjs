const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function createLogoPNG(outputPath) {
  const width = 800;
  const height = 200;
  const png = new PNG({ width, height });

  // Fill transparent or white background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
      png.data[idx + 3] = 255;
    }
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(outputPath);
  png.pack().pipe(writeStream);
  writeStream.on('finish', () => console.log('Successfully created:', outputPath));
}

createLogoPNG(path.join(__dirname, '../public/assets/brand/edutaktis-logo.png'));
createLogoPNG(path.join(__dirname, '../assets/brand/edutaktis-logo.png'));
