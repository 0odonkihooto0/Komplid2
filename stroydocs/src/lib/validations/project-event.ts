import { z } from 'zod';

export const createProjectEventSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().max(2000).optional(),
  eventType: z.enum(['MEETING', 'GSN_INSPECTION', 'ACCEPTANCE', 'AUDIT', 'COMMISSIONING', 'OTHER']),
  scheduledAt: z.string().min(1, 'Дата обязательна'),
  location: z.string().max(500).optional(),
  notifyDays: z.number().int().min(0).max(30).default(3),
  contractId: z.string().uuid().optional(),
  participantIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectEventSchema = createProjectEventSchema.partial().extend({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
  protocolS3Key: z.string().optional(),
  protocolFileName: z.string().max(255).optional(),
});

export type CreateProjectEventInput = z.infer<typeof createProjectEventSchema>;
export type UpdateProjectEventInput = z.infer<typeof updateProjectEventSchema>;
