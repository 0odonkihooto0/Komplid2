'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Сообщение в чате с AI-юристом
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export function useAiLawyerChat() {
  const queryClient = useQueryClient();

  // Загрузка истории чата
  const historyQuery = useQuery({
    queryKey: ['ai-lawyer-history'],
    queryFn: async () => {
      const res = await fetch('/api/customer/ai-lawyer/history');
      const json: { success: boolean; data: { messages: ChatMessage[] }; error?: string } =
        await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.messages;
    },
  });

  // Отправка вопроса пользователя
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch('/api/customer/ai-lawyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const json: {
        success: boolean;
        data: { answer: string; conversationId: string };
        error?: string;
      } = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      // Обновляем историю после получения ответа
      queryClient.invalidateQueries({ queryKey: ['ai-lawyer-history'] });
    },
  });

  return {
    messages: historyQuery.data ?? [],
    isLoading: historyQuery.isLoading,
    isSending: sendMutation.isPending,
    sendMessage: sendMutation.mutate,
    error: sendMutation.error,
  };
}
