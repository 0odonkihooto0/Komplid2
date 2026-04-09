import { z } from 'zod';

export const createPIRRegistrySchema = z.object({
  senderOrgId: z.string().optional(),
  receiverOrgId: z.string().optional(),
  senderPersonId: z.string().optional(),
  receiverPersonId: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePIRRegistrySchema = z.object({
  senderOrgId: z.string().nullable().optional(),
  receiverOrgId: z.string().nullable().optional(),
  senderPersonId: z.string().nullable().optional(),
  receiverPersonId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Discriminated union для операций добавления/удаления документа в реестр
export const registryActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('addDoc'), docId: z.string().min(1) }),
  z.object({ action: z.literal('removeDoc'), docId: z.string().min(1) }),
]);

export type CreatePIRRegistryInput = z.infer<typeof createPIRRegistrySchema>;
export type UpdatePIRRegistryInput = z.infer<typeof updatePIRRegistrySchema>;
export type RegistryActionInput = z.infer<typeof registryActionSchema>;
