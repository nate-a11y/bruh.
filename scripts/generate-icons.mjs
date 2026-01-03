import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Source logo file
const sourceLogo = join(publicDir, 'Untitled (4).png');

async function generateIcons() {
  console.log('Generating icons from source logo...');

  // Generate 512x512 icon
  await sharp(sourceLogo)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // Generate 192x192 icon
  await sharp(sourceLogo)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // Generate apple-touch-icon (180x180)
  await sharp(sourceLogo)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // Generate favicon sizes (16, 32, 48)
  await sharp(sourceLogo)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon-32x32.png'));
  console.log('✓ favicon-32x32.png');

  await sharp(sourceLogo)
    .resize(16, 16)
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));
  console.log('✓ favicon-16x16.png');

  await sharp(sourceLogo)
    .resize(48, 48)
    .png()
    .toFile(join(publicDir, 'favicon-48x48.png'));
  console.log('✓ favicon-48x48.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
