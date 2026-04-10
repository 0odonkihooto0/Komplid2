import { z } from 'zod';

export const createSEDSchema = z.object({
  docType: z.enum(['LETTER', 'ORDER', 'PROTOCOL', 'ACT', 'MEMO', 'NOTIFICATION', 'OTHER']),
  title: z.string().min(3, 'Введите заголовок документа').max(500),
  body: z.string().optional(),
  senderOrgId: z.string().uuid('Выберите организацию-отправителя'),
  receiverOrgIds: z.array(z.string().uuid()).min(1, 'Укажите хотя бы одного получателя'),
  tags: z.array(z.string()).optional(),
});

export const updateSEDSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  body: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'IN_APPROVAL', 'REQUIRES_ACTION', 'APPROVED', 'REJECTED', 'ARCHIVED'])
    .optional(),
});

export const addSEDAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1, 'Укажите MIME-тип'),
  size: z.number().int().positive('Размер файла должен быть больше 0'),
});

export type CreateSEDInput = z.infer<typeof createSEDSchema>;
export type UpdateSEDInput = z.infer<typeof updateSEDSchema>;
export type AddSEDAttachmentInput = z.infer<typeof addSEDAttachmentSchema>;

export const createSEDFolderSchema = z.object({
  name: z.string().min(1, 'Введите название папки').max(200),
  parentId: z.string().uuid().optional(),
  order: z.number().int().optional(),
});

export const updateSEDFolderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
  order: z.number().int().optional(),
});

export const addSEDLinkSchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
});

export const markReadSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(100),
  isRead: z.boolean(),
});

export type CreateSEDFolderInput = z.infer<typeof createSEDFolderSchema>;
export type UpdateSEDFolderInput = z.infer<typeof updateSEDFolderSchema>;
export type AddSEDLinkInput = z.infer<typeof addSEDLinkSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
