'use strict';

/**
 * Кастомный сервер — Next.js + Socket.io на одном порту (3000).
 * Запускается командой: node server.js
 *
 * Чат работает через Socket.io на том же HTTP-сервере что и Next.js.
 * Клиент подключается к тому же origin — отдельный порт не нужен.
 * Серверы РФ (Timeweb Cloud), ФЗ-152 ✅
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { jwtVerify } = require('jose');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const port = parseInt(process.env.PORT ?? '3000', 10);

const db = new PrismaClient();
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Единый HTTP-сервер для Next.js и Socket.io
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url ?? '/', true));
  });

  // ─── Socket.io — подключаем к тому же HTTP-серверу ──────────────────────────

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.APP_URL ?? `http://localhost:${port}`,
      credentials: true,
    },
  });

  // Аутентификация через JWT (тот же NEXTAUTH_SECRET, выдаётся из /api/auth/socket-token)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      socket.data.userId = payload.userId;
      socket.data.organizationId = payload.organizationId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Обработка событий ───────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    // Вступить в комнату проекта
    socket.on('join:project', (projectId) => {
      if (typeof projectId === 'string') {
        socket.join(`project:${projectId}`);
      }
    });

    // Покинуть комнату проекта
    socket.on('leave:project', (projectId) => {
      if (typeof projectId === 'string') {
        socket.leave(`project:${projectId}`);
      }
    });

    // Новое сообщение: сохранить в PostgreSQL → разослать всем в комнате
    socket.on('message:send', async (data) => {
      const { projectId, contractId, text, replyToId, attachmentType, attachmentId } = data;
      if (!text?.trim() || !projectId) return;

      try {
        const message = await db.chatMessage.create({
          data: {
            text: text.trim(),
            projectId,
            contractId: contractId ?? null,
            authorId: socket.data.userId,
            replyToId: replyToId ?? null,
            attachmentType: attachmentType ?? null,
            attachmentId: attachmentId ?? null,
          },
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            replyTo: {
              select: {
                id: true,
                text: true,
                deletedAt: true,
                author: { select: { id: true, firstName: true } },
              },
            },
          },
        });

        // Маскируем удалённую цитату перед отправкой
        const payload = {
          ...message,
          replyTo: message.replyTo
            ? {
                ...message.replyTo,
                text: message.replyTo.deletedAt
                  ? 'Сообщение удалено'
                  : message.replyTo.text,
              }
            : null,
        };

        io.to(`project:${projectId}`).emit('message:new', payload);
      } catch (err) {
        console.error('[socket] message:send error', err);
        socket.emit('message:error', { error: 'Ошибка отправки сообщения' });
      }
    });

    // Индикатор «печатает...» — ретрансляция без сохранения в БД
    socket.on('typing:start', ({ projectId }) => {
      if (typeof projectId === 'string') {
        socket.to(`project:${projectId}`).emit('typing:user', {
          userId: socket.data.userId,
        });
      }
    });

    socket.on('disconnect', () => {
      // Комнаты очищаются автоматически при дисконнекте
    });
  });

  // ─── Запуск ──────────────────────────────────────────────────────────────────

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
