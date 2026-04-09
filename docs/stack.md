# stack.md — Технический стек StroyDocs

## Frontend
- **Framework**: Next.js 14 App Router
- **UI**: React + TypeScript strict mode
- **Стили**: Tailwind CSS + shadcn/ui (тема: синий `#2563EB`)
- **Таблицы**: TanStack Table v8
- **PDF**: react-pdf (просмотр) + Puppeteer (генерация через Handlebars)
- **Графики**: Recharts
- **Ганта**: gantt-task-react (MVP) → dhtmlx-gantt (при масштабировании)
- **Аннотации**: Canvas API (рисование поверх фото и PDF)
- **Формы**: React Hook Form + Zod
- **Состояние**: TanStack Query (серверное) + Zustand (глобальное)
- **Drag-and-drop загрузка**: react-dropzone
- **QR-коды**: qrcode (npm)
- **ZIP архивы**: archiver (npm)

## Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Next.js API Routes (монолит)
- **ORM**: Prisma
- **БД**: PostgreSQL (Timeweb Managed)
- **Кэш**: Redis (Timeweb Managed) — через BullMQ + ioredis
- **Очереди**: BullMQ + Redis
- **Auth**: NextAuth.js + JWT (maxAge: 24ч, updateAge: 1ч)
- **ЭЦП**: КриптоПро CSP (через REST API шлюз) — абстракция `SignatureProvider`

## Файловое хранилище
- **Провайдер**: Timeweb S3 (`@aws-sdk/client-s3`, `forcePathStyle: true`)
- **Метаданные**: только в БД (s3Key, fileName, mimeType, size)
- **Доступ**: pre-signed URL (TTL: 1 час — не менять!)
- **Сжатие фото**: browser-image-compression (на клиенте перед загрузкой)

```typescript
// Инициализация S3 клиента (обязательный forcePathStyle!)
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});
```

## AI / Интеграции
- **YandexGPT**: парсинг смет Excel/PDF (Yandex Cloud API, серверы РФ ✅)
- **Gemini**: fallback для YandexGPT при недоступности
- **Парсинг смет**: xml2js (XML Гранд-Смета), exceljs (xlsx), pdf-parse (PDF)
- **OCR**: Yandex Vision API (Фаза позже)

## Realtime / Мобайл
- **Чат**: Socket.io — ОТДЕЛЬНЫЙ процесс на порту 3001 (не в Next.js API Route!)
- **PWA**: next-pwa (Workbox) — офлайн-кэш статики + 10 последних документов

## DevOps
- **Контейнеры**: Docker + Docker Compose (локальная разработка)
- **CI/CD**: GitHub Actions → Timeweb Cloud VPS / App Platform
- **Локальная разработка**: PostgreSQL + Redis + MinIO (docker-compose.local.yml)

## Важные конфигурации
```bash
# Локальный запуск
cp .env.example .env.local
docker compose -f docker-compose.local.yml up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev  # → http://localhost:3000

# Socket.io сервер (отдельный терминал)
npm run socket  # → порт 3001
```

## Переменные окружения (обязательные)
```
DATABASE_URL, REDIS_URL, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY
S3_BUCKET, NEXTAUTH_SECRET, NEXTAUTH_URL, APP_URL
YANDEX_GPT_API_KEY, YANDEX_FOLDER_ID (или GEMINI_API_KEY для fallback)
```
