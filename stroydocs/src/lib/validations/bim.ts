import { z } from 'zod';
import { BimModelStage, BimAccessLevel } from '@prisma/client';

// --- Разделы ---

export const createSectionSchema = z.object({
  name: z.string().min(1, 'Введите название раздела').max(200),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1, 'Введите название раздела').max(200),
});

// --- Модели ---

export const createModelSchema = z.object({
  name: z.string().min(1, 'Введите наименование модели').max(300),
  comment: z.string().max(1000).optional().nullable(),
  sectionId: z.string().uuid('Укажите раздел'),
  stage: z.nativeEnum(BimModelStage).optional().nullable(),
  s3Key: z.string().min(1, 'Отсутствует ключ S3'),
  fileName: z.string().min(1, 'Отсутствует имя файла'),
  fileSize: z.number().int().positive().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  /** Источник модели: nanoCAD BIM, Renga, Pilot-BIM и т.д. */
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1),
});

export const uploadVersionSchema = z.object({
  name: z.string().min(1, 'Введите наименование версии').max(300),
  comment: z.string().max(1000).optional().nullable(),
  s3Key: z.string().min(1, 'Отсутствует ключ S3'),
  fileName: z.string().min(1, 'Отсутствует имя файла'),
  fileSize: z.number().int().positive().optional().nullable(),
  /** Если true — обновить s3Key основной модели на эту версию */
  setAsCurrent: z.boolean().optional().default(false),
});

// --- Связи ---

const ALLOWED_ENTITY_TYPES = ['GanttTask', 'ExecutionDoc', 'Ks2Act', 'Defect'] as const;

export const createLinkSchema = z.object({
  elementId: z.string().uuid('Укажите элемент'),
  modelId: z.string().uuid('Укажите модель'),
  entityType: z.enum(ALLOWED_ENTITY_TYPES),
  entityId: z.string().uuid('Укажите сущность'),
});

// --- Доступ ---

export const createAccessSchema = z.object({
  userId: z.string().uuid('Укажите пользователя'),
  level: z.nativeEnum(BimAccessLevel),
  stage: z.nativeEnum(BimModelStage).optional().nullable(),
  /** Статус модели: Согласована | Утверждена | На согласовании и т.д. */
  status: z.string().max(100).optional().nullable(),
});

// --- Типы ---

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateModelInput = z.infer<typeof createModelSchema>;
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
export type UploadVersionInput = z.infer<typeof uploadVersionSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type CreateAccessInput = z.infer<typeof createAccessSchema>;
