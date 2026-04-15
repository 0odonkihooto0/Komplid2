import { execSync } from 'child_process';

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
  transpilePackages: ['three'],

  // Handlebars использует require.extensions (Node.js API) — подавляем webpack-предупреждение.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        { message: /require\.extensions is not supported by webpack/ },
      ];
    }
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
