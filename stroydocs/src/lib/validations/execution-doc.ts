import { z } from 'zod';

export const createExecutionDocSchema = z.object({
  type: z.enum(['AOSR', 'OZR', 'TECHNICAL_READINESS_ACT']),
  workRecordId: z.string().optional(),
  title: z.string().optional(),
});

export const updateExecutionDocStatusSchema = z.object({
  status: z.enum(['DRAFT', 'IN_REVIEW', 'SIGNED', 'REJECTED']),
});

/** Схема для ручного редактирования полей документа (Фаза 3.6.1) */
export const updateOverrideFieldsSchema = z.object({
  overrideFields: z.record(z.string(), z.string()).optional(),
  overrideHtml: z.string().nullable().optional(),
});

/** Поля формы редактирования АОСР */
export const aosrOverrideSchema = z.object({
  number: z.string().optional(),
  date: z.string().optional(),
  location: z.string().optional(),
  normative: z.string().optional(),
  workName: z.string().optional(),
  description: z.string().optional(),
  workDateStart: z.string().optional(),
  workDateEnd: z.string().optional(),
});

/** Поля формы редактирования ОЖР */
export const ozrOverrideSchema = z.object({
  number: z.string().optional(),
  date: z.string().optional(),
  section3Text: z.string().optional(),
  section5Text: z.string().optional(),
});

/** Поля формы редактирования КС-2 */
export const ks2OverrideSchema = z.object({
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  totalAmount: z.string().optional(),
});

/** Поля формы редактирования АВК/ЖВК */
export const inputControlOverrideSchema = z.object({
  date: z.string().optional(),
  result: z.string().optional(),
  remarks: z.string().optional(),
});

export type CreateExecutionDocInput = z.infer<typeof createExecutionDocSchema>;
export type UpdateExecutionDocStatusInput = z.infer<typeof updateExecutionDocStatusSchema>;
export type UpdateOverrideFieldsInput = z.infer<typeof updateOverrideFieldsSchema>;
