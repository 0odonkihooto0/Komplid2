'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

interface CreatePayload {
  subject: string;
  senderOrgId: string;
  receiverOrgId: string;
  body: string;
  files: File[];
}

export function useAddCorrespondence(objectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ subject, senderOrgId, receiverOrgId, body, files }: CreatePayload) => {
      // 1. Создаём черновик письма
      const createRes = await fetch(`/api/projects/${objectId}/correspondence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'OUTGOING',
          subject,
          body,
          senderOrgId,
          receiverOrgId,
        }),
      });
      const createJson = await createRes.json();
      if (!createJson.success) throw new Error(createJson.error ?? 'Ошибка создания письма');
      const corrId: string = createJson.data.id;

      // 2. Загружаем вложения через pre-signed URL
      for (const file of files) {
        const attachRes = await fetch(
          `/api/projects/${objectId}/correspondence/${corrId}/attachments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
          }
        );
        const attachJson = await attachRes.json();
        if (!attachJson.success) throw new Error(attachJson.error ?? 'Ошибка загрузки файла');
        const { uploadUrl } = attachJson.data as { uploadUrl: string };

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
      }

      // 3. Отправляем письмо: DRAFT → SENT, создаёт уведомление получателю
      const sendRes = await fetch(
        `/api/projects/${objectId}/correspondence/${corrId}/send`,
        { method: 'POST' }
      );
      const sendJson = await sendRes.json();
      if (!sendJson.success) throw new Error(sendJson.error ?? 'Ошибка отправки');

      return sendJson.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correspondence', objectId] });
      toast({ title: 'Письмо отправлено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { createMutation, isPending: createMutation.isPending };
}
