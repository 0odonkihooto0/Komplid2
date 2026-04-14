import { z } from 'zod';

export const createDocCommentSchema = z.object({
  text: z.string().min(1, 'Введите текст замечания'),
  pageNumber: z.number().int().positive().optional(),
  positionX: z.number().min(0).max(1).optional(),
  positionY: z.number().min(0).max(1).optional(),
  // Расширенные поля
  urgency: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).optional(),
  remarkType: z.enum(['DESIGN', 'QUALITY', 'SAFETY', 'PROCESS', 'OTHER']).optional(),
  responsibleId: z.string().uuid().optional(),
  watcherIds: z.array(z.string().uuid()).default([]),
  plannedResolveDate: z.string().datetime().optional(),
  suggestion: z.string().optional(),
  attachmentS3Keys: z.array(z.string()).default([]),
});

export const updateDocCommentStatusSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']),
  suggestion: z.string().optional(),
  responsibleId: z.string().uuid().optional().nullable(),
  plannedResolveDate: z.string().datetime().optional().nullable(),
  actualResolveDate: z.string().datetime().optional().nullable(),
});

export const createDocCommentReplySchema = z.object({
  text: z.string().min(1, 'Введите текст ответа'),
  attachmentS3Keys: z.array(z.string()).default([]),
});

export type CreateDocCommentInput = z.infer<typeof createDocCommentSchema>;
export type UpdateDocCommentStatusInput = z.infer<typeof updateDocCommentStatusSchema>;
export type CreateDocCommentReplyInput = z.infer<typeof createDocCommentReplySchema>;
