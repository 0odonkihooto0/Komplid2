import { z } from 'zod';

export const createContractSchema = z.object({
  number: z.string().min(1, 'Введите номер договора'),
  name: z.string().min(2, 'Введите наименование'),
  type: z.enum(['MAIN', 'SUBCONTRACT']),
  contractKindId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  parentId: z.string().optional().nullable(),
  totalAmount: z.number().optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
});

export const updateContractSchema = createContractSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED']).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  totalAmount: z.number().optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
});

export const addParticipantSchema = z.object({
  organizationId: z.string().min(1, 'Выберите организацию'),
  role: z.enum(['DEVELOPER', 'CONTRACTOR', 'SUPERVISION', 'SUBCONTRACTOR']),
  appointmentOrder: z.string().optional(),
  appointmentDate: z.string().optional(),
  representativeName: z.string().optional(),
  position: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
