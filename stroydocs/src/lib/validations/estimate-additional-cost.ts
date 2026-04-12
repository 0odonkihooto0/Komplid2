import { z } from 'zod';
import {
  EstimateAdditionalCostType,
  EstimateAdditionalCostApplicationMode,
  EstimateCalculationMethod,
} from '@prisma/client';

/** Создание дополнительной затраты */
export const createAdditionalCostSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(300),
  costType: z.nativeEnum(EstimateAdditionalCostType),
  applicationMode: z.nativeEnum(EstimateAdditionalCostApplicationMode),
  level: z.number().int().min(1).default(1),
  value: z.string().max(500).nullable().optional(),
  constructionWorks: z.string().max(500).nullable().optional(),
  mountingWorks: z.string().max(500).nullable().optional(),
  equipment: z.string().max(500).nullable().optional(),
  other: z.string().max(500).nullable().optional(),
  calculationMethod: z.nativeEnum(EstimateCalculationMethod),
  useCustomPrecision: z.boolean().default(false),
  precision: z.number().int().min(0).max(10).nullable().optional(),
  chapterNames: z.array(z.string().min(1)).default([]),
  versionIds: z.array(z.string().uuid()).default([]),
});

/** Обновление дополнительной затраты */
export const patchAdditionalCostSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  costType: z.nativeEnum(EstimateAdditionalCostType).optional(),
  applicationMode: z.nativeEnum(EstimateAdditionalCostApplicationMode).optional(),
  level: z.number().int().min(1).optional(),
  value: z.string().max(500).nullable().optional(),
  constructionWorks: z.string().max(500).nullable().optional(),
  mountingWorks: z.string().max(500).nullable().optional(),
  equipment: z.string().max(500).nullable().optional(),
  other: z.string().max(500).nullable().optional(),
  calculationMethod: z.nativeEnum(EstimateCalculationMethod).optional(),
  useCustomPrecision: z.boolean().optional(),
  precision: z.number().int().min(0).max(10).nullable().optional(),
  chapterNames: z.array(z.string().min(1)).optional(),
  versionIds: z.array(z.string().uuid()).optional(),
});

/** Создание коэффициента пересчёта */
export const createCoefficientSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(300),
  code: z.string().max(100).nullable().optional(),
  application: z.string().min(1, 'Область применения обязательна').max(500),
  value: z.number({ error: 'Значение обязательно' }),
});

/** Обновление коэффициента */
export const patchCoefficientSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  code: z.string().max(100).nullable().optional(),
  application: z.string().min(1).max(500).optional(),
  value: z.number().optional(),
  isEnabled: z.boolean().optional(),
});

export type CreateAdditionalCostInput = z.infer<typeof createAdditionalCostSchema>;
export type PatchAdditionalCostInput = z.infer<typeof patchAdditionalCostSchema>;
export type CreateCoefficientInput = z.infer<typeof createCoefficientSchema>;
export type PatchCoefficientInput = z.infer<typeof patchCoefficientSchema>;
