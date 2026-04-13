import { z } from 'zod';

export const createRequestCommentSchema = z.object({
  text: z.string().min(1, 'Введите текст комментария').max(2000),
  parentId: z.string().uuid().optional(),
});

export const updateRequestCommentSchema = z.object({
  text: z.string().min(1, 'Текст не может быть пустым').max(2000),
});
