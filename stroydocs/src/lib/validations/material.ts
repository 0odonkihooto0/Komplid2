import { z } from 'zod';

export const createMaterialSchema = z.object({
  name: z.string().min(2, 'Введите наименование материала'),
  supplier: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  unit: z.enum(['PIECE', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'SET']),
  quantityReceived: z.number().positive('Количество должно быть больше 0'),
});

export const updateMaterialSchema = createMaterialSchema.partial();

export const createMaterialDocumentSchema = z.object({
  type: z.enum(['PASSPORT', 'CERTIFICATE', 'PROTOCOL']),
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1),
  size: z.number().positive(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateMaterialDocumentInput = z.infer<typeof createMaterialDocumentSchema>;
