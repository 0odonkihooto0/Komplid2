import { z } from 'zod';

export const createBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Введите номер партии'),
  quantity: z.number().positive('Количество должно быть больше 0'),
  arrivalDate: z.string().min(1, 'Укажите дату поступления'),
  storageLocation: z.string().optional(),
});

export const createInputControlRecordSchema = z.object({
  batchId: z.string().min(1, 'Выберите партию'),
  date: z.string().min(1, 'Укажите дату проверки'),
  result: z.enum(['CONFORMING', 'NON_CONFORMING', 'CONDITIONAL']),
  notes: z.string().optional(),
});

export const createInputControlActSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type CreateInputControlRecordInput = z.infer<typeof createInputControlRecordSchema>;
export type CreateInputControlActInput = z.infer<typeof createInputControlActSchema>;
