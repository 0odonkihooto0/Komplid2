import { z } from 'zod';

export const TC_TYPES = [
  'Водоснабжение',
  'Водоотведение',
  'Теплоснабжение',
  'Электроснабжение',
  'Газоснабжение',
  'Ливневая канализация',
  'Слаботочная система',
  'Связь',
] as const;

export const createTechnicalConditionSchema = z.object({
  type: z.string().min(1, 'Укажите тип ТУ'),
  connectionAvailability: z.string().optional(),
  issueDate: z.string().optional().nullable(),
  number: z.string().optional(),
  expirationDate: z.string().optional().nullable(),
  issuingAuthority: z.string().optional(),
  connectionConditions: z.string().optional(),
  landPlotId: z.string().uuid().optional().nullable(),
  responsibleOrgId: z.string().uuid().optional().nullable(),
  documentS3Key: z.string().optional().nullable(),
  documentFileName: z.string().optional().nullable(),
});

export const updateTechnicalConditionSchema = createTechnicalConditionSchema.partial();

export type CreateTechnicalConditionInput = z.infer<typeof createTechnicalConditionSchema>;
export type UpdateTechnicalConditionInput = z.infer<typeof updateTechnicalConditionSchema>;
