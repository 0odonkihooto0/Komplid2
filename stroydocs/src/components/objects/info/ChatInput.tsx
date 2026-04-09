import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMsg } from '@/hooks/useChatMessages';

interface ChatInputProps {
  replyTo: ChatMsg | null;
  onCancelReply: () => void;
  onSend: (text: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
}

/**
 * Поле ввода сообщения чата.
 * Enter — отправить, Shift+Enter — перенос строки.
 * При наличии цитируемого сообщения показывает блок ответа.
 */
export function ChatInput({ replyTo, onCancelReply, onSend, onTyping, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Авто-ресайз textarea
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;

    // Throttled typing event (не чаще 1 раза в 3 сек)
    if (!typingThrottleRef.current && onTyping) {
      onTyping();
      typingThrottleRef.current = setTimeout(() => {
        typingThrottleRef.current = null;
      }, 3000);
    }
  }, [onTyping]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    // submit захвачен через ref, чтобы не пересоздавать обработчик
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const submit = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    onSend(text);
    el.value = '';
    el.style.height = 'auto';
  }, [onSend]);

  return (
    <div className="border-t bg-white px-4 py-3">
      {/* Блок цитаты при ответе */}
      {replyTo && (
        <div className="mb-2 flex items-start justify-between rounded-lg border-l-4 border-blue-400 bg-blue-50 px-3 py-1.5 text-sm">
          <div className="min-w-0">
            <span className="font-medium text-blue-700">{replyTo.author.firstName}</span>
            <p className="truncate text-gray-500">
              {replyTo.deletedAt ? 'Сообщение удалено' : replyTo.text.slice(0, 100)}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            aria-label="Отменить ответ"
            className="ml-2 shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Написать сообщение…"
          disabled={disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm',
            'placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          onClick={submit}
          disabled={disabled}
          aria-label="Отправить"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            'bg-blue-600 text-white transition-colors hover:bg-blue-700',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
