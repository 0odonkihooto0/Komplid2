import { z } from 'zod';

const writeoffSchema = z.object({
  materialId: z.string().min(1, 'Выберите материал'),
  quantity: z.number().positive('Количество должно быть больше 0'),
});

export const createWorkRecordSchema = z.object({
  date: z.string().min(1, 'Укажите дату выполнения'),
  location: z.string().min(1, 'Укажите место проведения работ'),
  description: z.string().optional(),
  normative: z.string().optional(),
  workItemId: z.string().min(1, 'Выберите вид работ'),
  writeoffs: z.array(writeoffSchema).optional(),
});

export const updateWorkRecordSchema = z.object({
  date: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  normative: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'REJECTED']).optional(),
});

export type CreateWorkRecordInput = z.infer<typeof createWorkRecordSchema>;
export type UpdateWorkRecordInput = z.infer<typeof updateWorkRecordSchema>;
