/**
 * Socket.io сервер — запускается как отдельный процесс на порту 3001.
 * Команда: npm run socket
 *
 * Аутентификация: JWT-токен из /api/auth/socket-token (подписан NEXTAUTH_SECRET).
 * Все данные (сообщения) хранятся в PostgreSQL через Prisma.
 * Серверы РФ (Timeweb Cloud), ФЗ-152 ✅
 */

import 'dotenv/config';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl, SOCKET_CONNECTION_LIMIT } from '@/lib/database-url';

const db = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl(SOCKET_CONNECTION_LIMIT) } },
});

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  },
});

// ─── Аутентификация через JWT ────────────────────────────────────────────────

io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) return next(new Error('Unauthorized'));

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    socket.data.userId = payload.userId as string;
    socket.data.organizationId = payload.organizationId as string;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ─── Обработка соединений ────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  // Вступить в комнату проекта (автоподписка на сообщения этого объекта)
  socket.on('join:project', (projectId: string) => {
    if (typeof projectId === 'string') {
      socket.join(`project:${projectId}`);
    }
  });

  // Покинуть комнату проекта
  socket.on('leave:project', (projectId: string) => {
    if (typeof projectId === 'string') {
      socket.leave(`project:${projectId}`);
    }
  });

  // Новое сообщение: сохранить в БД → разослать всем в комнате
  socket.on('message:send', async (data: {
    projectId: string;
    contractId?: string;
    text: string;
    replyToId?: string;
    attachmentType?: string;
    attachmentId?: string;
  }) => {
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

      // Маскируем цитируемое удалённое сообщение
      const payload = {
        ...message,
        replyTo: message.replyTo
          ? {
              ...message.replyTo,
              text: message.replyTo.deletedAt ? 'Сообщение удалено' : message.replyTo.text,
            }
          : null,
      };

      io.to(`project:${projectId}`).emit('message:new', payload);
    } catch (err) {
      console.error('[socket] message:send error', err);
      socket.emit('message:error', { error: 'Ошибка отправки сообщения' });
    }
  });

  // Индикатор «печатает...» — ретранслируем остальным в комнате (без сохранения в БД)
  socket.on('typing:start', ({ projectId }: { projectId: string }) => {
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

const PORT = parseInt(process.env.SOCKET_PORT ?? '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`[socket] Socket.io server running on port ${PORT}`);
});
