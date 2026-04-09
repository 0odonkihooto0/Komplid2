import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build ID на основе git-хэша — стабилен внутри одного деплоя, меняется при новом.
  // Помогает клиентам обнаружить устаревшие Server Action ID после деплоя.
  generateBuildId: async () => {
    try {
      return execSync('git rev-parse HEAD', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    } catch {
      return `build-${Date.now()}`;
    }
  },

  // output: "standalone" убран — используем кастомный server.ts (Next.js + Socket.io на одном порту)
  // Standalone несовместим с кастомным сервером: он создаёт собственный server.js в .next/standalone/

  // Отключаем ESLint во время сборки — ошибки линтера не блокируют Docker-деплой
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Three.js требует transpilation в Next.js.
  // web-ifc НЕ добавляем: пакет поставляет CommonJS и не требует транспиляции.
  // Добавление web-ifc в transpilePackages заставляет webpack переписывать
  // `new URL('./web-ifc.wasm', import.meta.url)` в hash-путь /_next/static/chunks/HASH.wasm,
  // что ломает SetWasmPath('/') и вызывает 404 при загрузке WASM в браузере.
  transpilePackages: ['three'],

  // Handlebars использует require.extensions (Node.js API) — подавляем webpack-предупреждение.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        { message: /require\.extensions is not supported by webpack/ },
      ];
      return config;
    }
    // webpack 5 трансформирует `new URL('./web-ifc.wasm', import.meta.url)`
    // в URL /_next/static/chunks/web-ifc.wasm но НЕ копирует файл.
    // asset/resource не срабатывает для URL-dependencies в dev-режиме.
    // afterEmit хук явно копирует WASM после каждого emit (dev + prod).
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.afterEmit.tapAsync('CopyWebIfcWasm', (_compilation, callback) => {
          const src = join(process.cwd(), 'node_modules', 'web-ifc', 'web-ifc.wasm');
          if (!existsSync(src)) { callback(); return; }
          const dest = join(compiler.outputPath, 'static', 'chunks', 'web-ifc.wasm');
          try {
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(src, dest);
          } catch { /* silent */ }
          callback();
        });
      },
    });
    return config;
  },

  // CORS: ограничиваем API-роуты только разрешёнными источниками
  async headers() {
    const allowedOrigin = process.env.APP_URL ?? 'https://app.stroydocs.ru';
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;
