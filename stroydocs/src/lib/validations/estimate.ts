import { z } from 'zod';

/** Валидация запроса на инициализацию загрузки сметы */
export const uploadEstimateSchema = z.object({
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1, 'Укажите MIME-тип'),
  size: z.number().positive('Размер файла должен быть больше 0'),
});

/** Валидация редактирования позиции импорта */
export const updateEstimateItemSchema = z.object({
  rawName: z.string().min(1, 'Введите наименование').optional(),
  rawUnit: z.string().nullable().optional(),
  volume: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  suggestedKsiNodeId: z.string().nullable().optional(),
  status: z.enum(['RECOGNIZED', 'MAPPED', 'UNMATCHED', 'SKIPPED']).optional(),
  normativeRefs: z.array(z.string()).optional(),
});

export type UploadEstimateInput = z.infer<typeof uploadEstimateSchema>;
export type UpdateEstimateItemInput = z.infer<typeof updateEstimateItemSchema>;
