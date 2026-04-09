import { z } from 'zod';

/** Данные штампа — автозаполняемые поля */
const stampDataSchema = z.object({
  docNumber: z.string().optional(),
  date: z.string().optional(),
  responsibleName: z.string().optional(),
  certifiedByName: z.string().optional(),
  certifiedByPos: z.string().optional(),
});

/** Запрос на наложение штампа на PDF */
export const stampRequestSchema = z.object({
  stampType: z.enum(['work_permit', 'certified_copy']),
  page: z.number().int().min(0).default(0),
  x: z.number().min(0).max(1), // нормализованные координаты (0–1)
  y: z.number().min(0).max(1),
  stampData: stampDataSchema.optional(),
});

export type StampRequestInput = z.infer<typeof stampRequestSchema>;
