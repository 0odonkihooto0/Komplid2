import { Trash2, CornerUpLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMsg } from '@/hooks/useChatMessages';

interface ChatMessageProps {
  message: ChatMsg;
  isOwn: boolean;
  onReply: (msg: ChatMsg) => void;
  onDelete: (msgId: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Отображает одно сообщение чата.
 * Своё сообщение — справа (синий фон), чужое — слева (серый фон).
 */
export function ChatMessage({ message, isOwn, onReply, onDelete }: ChatMessageProps) {
  const isDeleted = !!message.deletedAt;
  const authorName = `${message.author.firstName} ${message.author.lastName}`;

  return (
    <div className={cn('group flex gap-2 px-4 py-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Аватар (инициалы) */}
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
        {message.author.firstName?.[0] ?? ''}{message.author.lastName?.[0] ?? ''}
      </div>

      <div className={cn('flex max-w-[70%] flex-col gap-0.5', isOwn ? 'items-end' : 'items-start')}>
        {/* Имя автора (только для чужих) */}
        {!isOwn && (
          <span className="text-xs font-medium text-gray-500">{authorName}</span>
        )}

        {/* Цитата (ответ на сообщение) */}
        {message.replyTo && (
          <div className={cn(
            'rounded-md border-l-4 px-2 py-1 text-xs text-gray-500',
            isOwn ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50'
          )}>
            <span className="font-medium">{message.replyTo.author.firstName}</span>
            {': '}
            <span className={cn(message.replyTo.deletedAt && 'italic')}>
              {message.replyTo.deletedAt ? 'Сообщение удалено' : message.replyTo.text.slice(0, 100)}
            </span>
          </div>
        )}

        {/* Тело сообщения */}
        <div className={cn(
          'relative rounded-2xl px-3 py-2 text-sm leading-relaxed',
          isOwn
            ? 'rounded-tr-sm bg-blue-600 text-white'
            : 'rounded-tl-sm bg-gray-100 text-gray-900',
          isDeleted && 'italic opacity-60'
        )}>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.text}
          </span>

          {/* Время */}
          <span className={cn(
            'ml-2 inline-block text-[10px] select-none',
            isOwn ? 'text-blue-200' : 'text-gray-400'
          )}>
            {formatTime(message.createdAt)}
            {message.isEdited && ' · изм.'}
          </span>
        </div>

        {/* Кнопки действий (видны при hover) */}
        {!isDeleted && (
          <div className={cn(
            'flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}>
            <button
              onClick={() => onReply(message)}
              aria-label="Ответить"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <CornerUpLeft size={12} />
            </button>
            {isOwn && (
              <button
                onClick={() => onDelete(message.id)}
                aria-label="Удалить"
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
