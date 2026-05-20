import sharp from 'sharp';
import fs from 'fs';

const sizes = [192, 512];

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#0a0a0f"/>
  <rect width="512" height="512" rx="100" fill="url(#g)" opacity="0.3"/>
  <text x="256" y="340" font-size="300" text-anchor="middle" font-family="Arial" fill="#6c63ff">⚡</text>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6c63ff"/>
      <stop offset="1" stop-color="#00d4ff"/>
    </linearGradient>
  </defs>
</svg>
`);

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`Created icon-${size}.png`);
}