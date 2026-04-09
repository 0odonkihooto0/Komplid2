import { z } from 'zod';

export const createWorkItemSchema = z.object({
  projectCipher: z.string().min(1, 'Введите шифр проекта'),
  name: z.string().min(2, 'Введите наименование работы'),
  description: z.string().optional(),
  unit: z.string().optional(),
  volume: z.number().optional(),
  normatives: z.string().optional(),
  ksiNodeId: z.string().optional(),
});

export const updateWorkItemSchema = createWorkItemSchema.partial();

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;
