'use client';

import { useState, useCallback } from 'react';

export interface ChatMsg {
  id: string;
  text: string;
  createdAt: string;
  isEdited: boolean;
  deletedAt: string | null;
  authorId: string;
  contractId: string | null;
  attachmentType: string | null;
  attachmentId: string | null;
  author: { id: string; firstName: string; lastName: string };
  replyTo: {
    id: string;
    text: string;
    deletedAt: string | null;
    author: { id: string; firstName: string };
  } | null;
}

interface UseChatMessagesReturn {
  messages: ChatMsg[];
  loading: boolean;
  hasMore: boolean;
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;
  prependMessage: (msg: ChatMsg) => void;
  sendFallback: (
    projectId: string,
    payload: {
      text: string;
      contractId?: string;
      replyToId?: string;
      attachmentType?: string;
      attachmentId?: string;
    }
  ) => Promise<ChatMsg | null>;
  deleteMessage: (projectId: string, msgId: string) => Promise<void>;
  markDeleted: (msgId: string) => void;
}

/**
 * Хук для управления историей сообщений чата.
 * Загружает историю через REST API (cursor-based pagination).
 * Используется вместе с useSocket для real-time обновлений.
 */
export function useChatMessages(objectId: string): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Загрузить первые 50 сообщений
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${objectId}/chat?limit=50`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      // API возвращает в порядке desc (новые первые), разворачиваем для отображения
      const msgs: ChatMsg[] = (json.data?.data ?? []).reverse();
      setMessages(msgs);
      setNextCursor(json.data?.nextCursor ?? null);
      setHasMore(!!json.data?.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [objectId]);

  // Дозагрузить более старые сообщения (infinite scroll вверх)
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${objectId}/chat?limit=50&before=${encodeURIComponent(nextCursor)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const older: ChatMsg[] = (json.data?.data ?? []).reverse();
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(json.data?.nextCursor ?? null);
      setHasMore(!!json.data?.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [objectId, nextCursor, loading]);

  // Добавить новое сообщение в конец (вызывается при socket-событии message:new)
  const prependMessage = useCallback((msg: ChatMsg) => {
    setMessages((prev) => {
      // Исключаем дублирование (на случай если сообщение уже пришло через fallback)
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // Fallback-отправка через REST, когда Socket.io недоступен
  const sendFallback = useCallback(
    async (projectId: string, payload: {
      text: string;
      contractId?: string;
      replyToId?: string;
      attachmentType?: string;
      attachmentId?: string;
    }): Promise<ChatMsg | null> => {
      try {
        const res = await fetch(`/api/projects/${projectId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const msg: ChatMsg = json.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        return msg;
      } catch {
        return null;
      }
    },
    []
  );

  // Мягкое удаление: обновить текст в локальном стейте
  const markDeleted = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, deletedAt: new Date().toISOString(), text: 'Сообщение удалено' } : m
      )
    );
  }, []);

  // Удалить сообщение через API
  const deleteMessage = useCallback(
    async (projectId: string, msgId: string) => {
      const res = await fetch(`/api/projects/${projectId}/chat/${msgId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        markDeleted(msgId);
      }
    },
    [markDeleted]
  );

  return {
    messages,
    loading,
    hasMore,
    loadInitial,
    loadMore,
    prependMessage,
    sendFallback,
    deleteMessage,
    markDeleted,
  };
}
