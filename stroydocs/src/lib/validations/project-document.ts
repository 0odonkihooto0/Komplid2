import { z } from 'zod';

export const createProjectFolderSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(255),
  parentId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
});

export const updateProjectFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  order: z.number().int().min(0).optional(),
  pinTop: z.boolean().optional(),
});

export const createProjectDocumentSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(255),
  folderId: z.string().uuid('Некорректный идентификатор папки'),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  fileSize: z.number().int().positive('Размер файла должен быть положительным'),
  description: z.string().max(1000).optional(),
});

export const createDocumentVersionSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  comment: z.string().max(500).optional(),
});

export type CreateProjectFolderInput = z.infer<typeof createProjectFolderSchema>;
export type UpdateProjectFolderInput = z.infer<typeof updateProjectFolderSchema>;
export type CreateProjectDocumentInput = z.infer<typeof createProjectDocumentSchema>;
export type CreateDocumentVersionInput = z.infer<typeof createDocumentVersionSchema>;
