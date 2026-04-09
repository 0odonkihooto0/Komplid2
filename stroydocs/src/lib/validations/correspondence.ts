import { z } from 'zod';

export const createCorrespondenceSchema = z.object({
  direction: z.enum(['OUTGOING', 'INCOMING']),
  subject: z.string().min(3, 'Введите тему письма').max(500),
  body: z.string().optional(),
  senderOrgId: z.string().uuid('Выберите организацию-отправителя'),
  receiverOrgId: z.string().uuid('Выберите организацию-получателя'),
  tags: z.array(z.string()).optional(),
  sentAt: z.string().datetime({ offset: true }).optional(),
});

export const updateCorrespondenceSchema = z.object({
  subject: z.string().min(3).max(500).optional(),
  body: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z
    .enum(['DRAFT', 'SENT', 'READ', 'IN_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED'])
    .optional(),
});

export const addCorrespondenceAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1, 'Укажите MIME-тип'),
  size: z.number().int().positive('Размер файла должен быть больше 0'),
});

export type CreateCorrespondenceInput = z.infer<typeof createCorrespondenceSchema>;
export type UpdateCorrespondenceInput = z.infer<typeof updateCorrespondenceSchema>;
export type AddCorrespondenceAttachmentInput = z.infer<typeof addCorrespondenceAttachmentSchema>;
