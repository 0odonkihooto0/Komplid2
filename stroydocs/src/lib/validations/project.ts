import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Введите название проекта'),
  address: z.string().optional(),
  description: z.string().optional(),
  generalContractor: z.string().optional(),
  customer: z.string().optional(),
});

// Поля паспорта объекта (Модуль 2)
const passportFields = z.object({
  cadastralNumber:     z.string().max(50).optional(),
  area:                z.number().positive().optional(),
  floors:              z.number().int().positive().optional(),
  responsibilityClass: z.string().max(10).optional(),
  permitNumber:        z.string().max(100).optional(),
  permitDate:          z.string().datetime({ offset: true }).optional().nullable(),
  permitAuthority:     z.string().max(300).optional(),
  designOrg:           z.string().max(300).optional(),
  chiefEngineer:       z.string().max(200).optional(),
  plannedStartDate:    z.string().datetime({ offset: true }).optional().nullable(),
  plannedEndDate:      z.string().datetime({ offset: true }).optional().nullable(),
  // Расширенные реквизиты
  constructionType:    z.string().max(100).optional().nullable(),
  region:              z.string().max(200).optional().nullable(),
  stroyka:             z.string().max(500).optional().nullable(),
  latitude:            z.number().min(-90).max(90).optional().nullable(),
  longitude:           z.number().min(-180).max(180).optional().nullable(),
  actualStartDate:     z.string().datetime({ offset: true }).optional().nullable(),
  actualEndDate:       z.string().datetime({ offset: true }).optional().nullable(),
  fillDatesFromGpr:    z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
}).and(passportFields);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
