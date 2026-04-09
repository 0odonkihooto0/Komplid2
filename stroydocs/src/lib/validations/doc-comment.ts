import { z } from 'zod';

export const createDocCommentSchema = z.object({
  text: z.string().min(1, 'Введите текст замечания'),
  pageNumber: z.number().int().positive().optional(),
  positionX: z.number().min(0).max(1).optional(),
  positionY: z.number().min(0).max(1).optional(),
});

export const updateDocCommentStatusSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']),
});

export type CreateDocCommentInput = z.infer<typeof createDocCommentSchema>;
export type UpdateDocCommentStatusInput = z.infer<typeof updateDocCommentStatusSchema>;
