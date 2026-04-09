'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useChatMessages, type ChatMsg } from '@/hooks/useChatMessages';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatViewProps {
  objectId: string;
}

/** Разделитель даты между сообщениями разных дней */
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-xs text-gray-400">{date}</span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Вкладка «Чат» Модуля 3 (Информация).
 * Real-time сообщения через Socket.io, история через REST API.
 * Fallback: жёлтый баннер + отправка через REST при недоступности сокета.
 */
export function ChatView({ objectId }: ChatViewProps) {
  const { data: session } = useSession();
  const { socket, connected } = useSocket(objectId);
  const {
    messages, loading, hasMore,
    loadInitial, loadMore, prependMessage,
    sendFallback, deleteMessage,
  } = useChatMessages(objectId);

  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузить историю при монтировании
  useEffect(() => {
    loadInitial().catch((err: unknown) => {
      console.error('[Chat] Ошибка начальной загрузки:', err);
      // Баннер fallback уже показывается при отсутствии соединения
    });
  }, [loadInitial]);

  // Показывать fallback-баннер если нет соединения через 5 сек
  useEffect(() => {
    if (connected) {
      setShowFallback(false);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      return;
    }
    fallbackTimerRef.current = setTimeout(() => setShowFallback(true), 5000);
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [connected]);

  // Подписаться на socket-события
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: ChatMsg) => {
      prependMessage(msg);
    };

    const onTyping = ({ userId }: { userId: string }) => {
      if (userId === session?.user?.id) return;
      // Ищем имя в уже загруженных сообщениях
      const found = messages.find((m) => m.author.id === userId);
      setTypingName(found ? found.author.firstName : 'Кто-то');
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingName(null), 3000);
    };

    const onError = (err: unknown) => {
      console.error('[Socket] Ошибка соединения:', err);
      // Graceful fallback: баннер уже показывается при connected=false
    };

    socket.on('message:new', onMessage);
    socket.on('typing:user', onTyping);
    socket.on('error', onError);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing:user', onTyping);
      socket.off('error', onError);
    };
  }, [socket, session?.user?.id, prependMessage, messages]);

  // Автопрокрутка вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Infinite scroll вверх
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop < 80) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const handleSend = useCallback(
    (text: string) => {
      if (connected && socket) {
        socket.emit('message:send', {
          projectId: objectId,
          text,
          replyToId: replyTo?.id,
        });
      } else {
        // Fallback через REST
        sendFallback(objectId, { text, replyToId: replyTo?.id });
      }
      setReplyTo(null);
    },
    [connected, socket, objectId, replyTo, sendFallback]
  );

  const handleTyping = useCallback(() => {
    socket?.emit('typing:start', { projectId: objectId });
  }, [socket, objectId]);

  const handleDelete = useCallback(
    (msgId: string) => deleteMessage(objectId, msgId),
    [deleteMessage, objectId]
  );

  // Группируем сообщения по дате для разделителей
  const renderMessages = () => {
    let lastDate = '';
    return messages.map((msg) => {
      const dateLabel = formatDateLabel(msg.createdAt);
      const showDate = dateLabel !== lastDate;
      lastDate = dateLabel;
      return (
        <div key={msg.id}>
          {showDate && <DateSeparator date={dateLabel} />}
          <ChatMessage
            message={msg}
            isOwn={msg.authorId === session?.user?.id}
            onReply={setReplyTo}
            onDelete={handleDelete}
          />
        </div>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-240px)] min-h-[400px] flex-col rounded-xl border border-gray-200 bg-white">
      {/* Заголовок с индикатором соединения */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900">Чат проекта</h3>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Подключён' : 'Офлайн'}</span>
        </div>
      </div>

      {/* Баннер fallback */}
      {showFallback && (
        <div className="flex items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          <WifiOff size={14} />
          <span>Реальное время недоступно.</span>
          <button
            onClick={loadInitial}
            className="flex items-center gap-1 underline hover:no-underline"
          >
            <RefreshCw size={12} />
            Обновить
          </button>
        </div>
      )}

      {/* Список сообщений */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2"
      >
        {loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Загрузка…
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Нет сообщений. Начните переписку!
          </div>
        )}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={loading}
              className="text-xs text-blue-500 hover:underline disabled:opacity-50"
            >
              {loading ? 'Загрузка…' : 'Загрузить ранее'}
            </button>
          </div>
        )}
        {renderMessages()}
        {/* Индикатор печатания */}
        {typingName && (
          <div className="px-4 py-1 text-xs italic text-gray-400">
            {typingName} печатает…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Поле ввода */}
      <ChatInput
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={false}
      />
    </div>
  );
}
