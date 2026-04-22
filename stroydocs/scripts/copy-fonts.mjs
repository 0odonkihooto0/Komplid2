/**
 * Копирует шрифты из node_modules/@fontsource* в public/fonts/
 * перед сборкой Next.js, чтобы не требовался доступ к Google Fonts при билде.
 *
 * Запускается автоматически через "prebuild" в package.json.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'public', 'fonts');

mkdirSync(dest, { recursive: true });

const files = [
  // Inter — variable weight, latin + cyrillic
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',    'inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2', 'inter-cyrillic-wght-normal.woff2'],
  // JetBrains Mono — weight 400 + 700, latin + cyrillic
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',    'jetbrains-mono-latin-400-normal.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-400-normal.woff2', 'jetbrains-mono-cyrillic-400-normal.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2',    'jetbrains-mono-latin-700-normal.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-700-normal.woff2', 'jetbrains-mono-cyrillic-700-normal.woff2'],
];

for (const [src, name] of files) {
  const srcPath = join(root, 'node_modules', src);
  const destPath = join(dest, name);
  if (!existsSync(srcPath)) {
    console.error(`[copy-fonts] Файл не найден: ${srcPath}`);
    process.exit(1);
  }
  copyFileSync(srcPath, destPath);
  console.log(`[copy-fonts] ✓ ${name}`);
}

console.log('[copy-fonts] Шрифты скопированы в public/fonts/');
