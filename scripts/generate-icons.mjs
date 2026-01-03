import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG content for the icon - orange background with black B
const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#ff6b00"/>
  <text x="256" y="340" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="320" font-weight="700" fill="#0a0a0a" text-anchor="middle">B</text>
</svg>`;

// For PNG generation, we need to use a simpler SVG that sharp can render
// Sharp has limited text support, so we'll create a simpler version
// B is optically centered (shifted right to account for asymmetric shape)
const simpleSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#ff6b00"/>
  <path fill="#0a0a0a" transform="translate(166, 128)" d="M0 0h100c28 0 50 8 67 24s25 37 25 64c0 20-6 37-17 50s-26 22-46 27v1c24 4 42 13 55 28s19 36 19 60c0 30-10 54-30 72s-48 26-84 26H0V0zm48 144h44c19 0 34-4 43-13s14-21 14-36c0-16-5-28-14-36s-23-12-42-12H48v97zm0 147h52c22 0 38-5 49-15s16-24 16-42c0-18-6-32-17-41s-29-14-52-14H48v112z"/>
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
