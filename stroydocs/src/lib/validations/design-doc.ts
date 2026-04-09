import { z } from 'zod';
import { DesignDocType, DesignDocStatus } from '@prisma/client';

export const createDesignDocSchema = z.object({
  name: z.string().min(1),
  docType: z.nativeEnum(DesignDocType),
  category: z.string().optional(),
  responsibleOrgId: z.string().optional(),
  responsibleUserId: z.string().optional(),
  notes: z.string().optional(),
  s3Keys: z.array(z.string()).default([]),
  currentS3Key: z.string().optional(),
});

export const updateDesignDocSchema = z.object({
  name: z.string().min(1).optional(),
  docType: z.nativeEnum(DesignDocType).optional(),
  category: z.string().nullable().optional(),
  status: z.nativeEnum(DesignDocStatus).optional(),
  responsibleOrgId: z.string().nullable().optional(),
  responsibleUserId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  s3Keys: z.array(z.string()).optional(),
  currentS3Key: z.string().nullable().optional(),
  linkedExecDocIds: z.array(z.string()).optional(),
  isDeleted: z.boolean().optional(),
});

export type CreateDesignDocInput = z.infer<typeof createDesignDocSchema>;
export type UpdateDesignDocInput = z.infer<typeof updateDesignDocSchema>;
