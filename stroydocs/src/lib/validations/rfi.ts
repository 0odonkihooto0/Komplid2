import { z } from 'zod';

export const createRFISchema = z.object({
  title: z.string().min(3, 'Введите краткое описание').max(200),
  description: z.string().min(10, 'Введите подробное описание'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  deadline: z.string().datetime({ offset: true }).optional(),
  assigneeId: z.string().uuid().optional(),
  linkedDocId: z.string().uuid().optional(),
  linkedDocType: z.enum(['ExecutionDoc', 'ArchiveDocument', 'Contract']).optional(),
});

export const updateRFISchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'ANSWERED', 'CLOSED', 'CANCELLED']).optional(),
});

export const answerRFISchema = z.object({
  response: z.string().min(5, 'Ответ должен содержать не менее 5 символов'),
});

export const addRFIAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1, 'Укажите MIME-тип'),
  size: z.number().int().positive('Размер файла должен быть больше 0'),
});

export type CreateRFIInput = z.infer<typeof createRFISchema>;
export type UpdateRFIInput = z.infer<typeof updateRFISchema>;
export type AnswerRFIInput = z.infer<typeof answerRFISchema>;
export type AddRFIAttachmentInput = z.infer<typeof addRFIAttachmentSchema>;
