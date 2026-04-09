'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

// Singleton-соединение: один WebSocket на всё приложение
let globalSocket: Socket | null = null;

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
}

/**
 * Хук для подключения к Socket.io серверу.
 * Создаёт одно соединение на всё приложение (singleton),
 * автоматически вступает в комнату проекта при монтировании.
 */
export function useSocket(projectId: string): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const initSocket = useCallback(async () => {
    // Если уже подключены — просто войти в комнату
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      globalSocket.emit('join:project', projectId);
      setConnected(true);
      return;
    }

    // Получить короткоживущий токен для Socket.io аутентификации
    let token: string;
    try {
      const res = await fetch('/api/auth/socket-token');
      if (!res.ok) return;
      const json = await res.json();
      token = json.data?.token;
      if (!token) return;
    } catch {
      return;
    }

    // Socket.io работает на том же сервере что и Next.js (порт 3000).
    // undefined = подключиться к текущему origin (app.stroydocs.ru в prod, localhost:3000 в dev).
    // NEXT_PUBLIC_SOCKET_URL можно задать явно если нужен отдельный хост.
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

    globalSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // polling как fallback при проблемах с WebSocket
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = globalSocket;

    globalSocket.on('connect', () => {
      setConnected(true);
      globalSocket!.emit('join:project', projectId);
    });

    globalSocket.on('disconnect', () => {
      setConnected(false);
    });

    globalSocket.on('connect_error', () => {
      setConnected(false);
    });
  }, [projectId]);

  useEffect(() => {
    initSocket();

    return () => {
      // Покинуть комнату при размонтировании (не рвём соединение — оно singleton)
      globalSocket?.emit('leave:project', projectId);
    };
  }, [initSocket, projectId]);

  return { socket: socketRef.current, connected };
}
