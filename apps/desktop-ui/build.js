import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = resolve(__dirname, 'dist');
mkdirSync(distDir, { recursive: true });

// Copy index.html to dist/index.html
const srcHtml = resolve(__dirname, 'index.html');
const destHtml = resolve(distDir, 'index.html');

if (existsSync(srcHtml)) {
  copyFileSync(srcHtml, destHtml);
  console.log(`Copied ${srcHtml} -> ${destHtml}`);
} else {
  console.error(`Error: ${srcHtml} not found`);
  process.exit(1);
}
