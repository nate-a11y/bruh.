import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG content for the icon - purple background with white B
const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#6366f1"/>
  <text x="256" y="340" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="320" font-weight="700" fill="white" text-anchor="middle">B</text>
</svg>`;

// For PNG generation, we need to use a simpler SVG that sharp can render
// Sharp has limited text support, so we'll create a simpler version
const simpleSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#6366f1"/>
  <path fill="white" d="M170 100h120c35 0 63 10 84 30s31 47 31 80c0 25-7 46-21 63s-33 28-57 33v2c30 4 53 15 69 35s24 45 24 75c0 38-13 68-38 90s-60 33-105 33H170V100zm60 180h55c24 0 42-5 54-16s18-26 18-45c0-20-6-35-17-45s-29-15-52-15h-58v121zm0 184h65c27 0 47-6 61-19s21-30 21-52c0-23-7-40-22-52s-36-18-64-18h-61v141z"/>
</svg>`;

async function generateIcons() {
  console.log('Generating icons...');

  // Generate 512x512 icon
  await sharp(Buffer.from(simpleSvg))
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // Generate 192x192 icon
  await sharp(Buffer.from(simpleSvg))
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // Generate apple-touch-icon (180x180)
  await sharp(Buffer.from(simpleSvg))
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // Generate favicon sizes (16, 32, 48)
  await sharp(Buffer.from(simpleSvg))
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon-32x32.png'));
  console.log('✓ favicon-32x32.png');

  await sharp(Buffer.from(simpleSvg))
    .resize(16, 16)
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));
  console.log('✓ favicon-16x16.png');

  // Generate 48x48 for favicon.ico base
  await sharp(Buffer.from(simpleSvg))
    .resize(48, 48)
    .png()
    .toFile(join(publicDir, 'favicon-48x48.png'));
  console.log('✓ favicon-48x48.png');

  console.log('\nAll icons generated successfully!');
  console.log('\nNote: For favicon.ico, you may want to use a tool like realfavicongenerator.net');
  console.log('or convert the 32x32 PNG to ICO format using an online converter.');
}

generateIcons().catch(console.error);
