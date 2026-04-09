import { z } from 'zod';

export const createDesignTaskSchema = z.object({
  taskType: z.enum(['DESIGN', 'SURVEY']).default('DESIGN'),
  docDate: z.string().datetime().optional(),
  approvedById: z.string().optional(),
  agreedById: z.string().optional(),
  customerOrgId: z.string().optional(),
  customerPersonId: z.string().optional(),
  s3Keys: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const updateDesignTaskSchema = z.object({
  docDate: z.string().datetime().nullable().optional(),
  status: z
    .enum([
      'DRAFT',
      'IN_PROGRESS',
      'SENT_FOR_REVIEW',
      'WITH_COMMENTS',
      'REVIEW_PASSED',
      'IN_APPROVAL',
      'APPROVED',
      'CANCELLED',
    ])
    .optional(),
  approvedById: z.string().nullable().optional(),
  agreedById: z.string().nullable().optional(),
  customerOrgId: z.string().nullable().optional(),
  customerPersonId: z.string().nullable().optional(),
  s3Keys: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

export type CreateDesignTaskInput = z.infer<typeof createDesignTaskSchema>;
export type UpdateDesignTaskInput = z.infer<typeof updateDesignTaskSchema>;
