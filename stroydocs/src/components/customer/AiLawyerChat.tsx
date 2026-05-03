'use client';

import { useEffect, useRef, useState } from 'react';
import { FeatureGate } from '@/components/subscriptions/FeatureGate';
import { PaywallBanner } from '@/components/subscriptions/PaywallBanner';
import { FEATURE_CODES } from '@/lib/features/codes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import { useAiLawyerChat } from './useAiLawyerChat';
import { Loader2, Send } from 'lucide-react';

function ChatContent() {
  const { messages, isLoading, isSending, sendMessage, error } = useAiLawyerChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Прокрутка вниз при появлении новых сообщений
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Показываем ошибку отправки через toast
  useEffect(() => {
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  }, [error]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Отправка по Enter без Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Список сообщений */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 border rounded-lg mb-3 bg-muted/10">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2 ml-auto" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Задайте вопрос — я отвечу на основе ГК РФ, ФЗ-2300-1 и ГОСТ Р 70108-2025.
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Индикатор загрузки ответа */}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Поле ввода */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ваш вопрос... (Enter — отправить, Shift+Enter — новая строка)"
          rows={2}
          className="resize-none flex-1"
          disabled={isSending}
        />
        <Button onClick={handleSend} disabled={!input.trim() || isSending} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AiLawyerChat() {
  return (
    <FeatureGate
      feature={FEATURE_CODES.CUSTOMER_AI_LAWYER}
      fallback={<PaywallBanner feature={FEATURE_CODES.CUSTOMER_AI_LAWYER} />}
    >
      <ChatContent />
    </FeatureGate>
  );
}
