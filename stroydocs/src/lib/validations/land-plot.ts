import { z } from 'zod';

export const createLandPlotSchema = z.object({
  cadastralNumber: z.string().min(1, 'Введите кадастровый номер'),
  address: z.string().optional(),
  area: z.number().positive().optional().nullable(),
  landCategory: z.string().optional(),
  permittedUse: z.string().optional(),
  cadastralValue: z.number().min(0).optional().nullable(),
  status: z.string().optional(),
  ownershipForm: z.string().optional(),
  hasEncumbrances: z.boolean().default(false),
  encumbranceInfo: z.string().optional(),
  hasRestrictions: z.boolean().default(false),
  restrictionInfo: z.string().optional(),
  hasDemolitionObjects: z.boolean().default(false),
  demolitionInfo: z.string().optional(),
  inspectionDate: z.string().optional().nullable(),
  egrnNumber: z.string().optional(),
  gpzuNumber: z.string().optional(),
  gpzuDate: z.string().optional().nullable(),
  gpzuS3Key: z.string().optional(),
  ownerOrgId: z.string().uuid().optional().nullable(),
  tenantOrgId: z.string().uuid().optional().nullable(),
});

export const updateLandPlotSchema = createLandPlotSchema.partial();

export type CreateLandPlotInput = z.infer<typeof createLandPlotSchema>;
export type UpdateLandPlotInput = z.infer<typeof updateLandPlotSchema>;
