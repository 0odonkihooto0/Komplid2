import { z } from 'zod';

export const createPIRClosureSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  contractorOrgId: z.string().optional(),
  customerOrgId: z.string().optional(),
  totalAmount: z.number().optional(),
});

export const fillPIRClosureSchema = z.object({
  items: z
    .array(
      z.object({
        workName: z.string().min(1),
        unit: z.string().optional(),
        volume: z.number().optional(),
        amount: z.number().optional(),
      })
    )
    .min(1),
});

export const updatePIRClosureSchema = z.object({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  contractorOrgId: z.string().nullable().optional(),
  customerOrgId: z.string().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
});

export type CreatePIRClosureInput = z.infer<typeof createPIRClosureSchema>;
export type FillPIRClosureInput = z.infer<typeof fillPIRClosureSchema>;
