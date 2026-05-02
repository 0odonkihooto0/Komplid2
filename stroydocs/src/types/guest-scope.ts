import { z } from 'zod';

export const guestScopeSchema = z.object({
  scope: z.enum(['FULL', 'CONTRACT_ONLY']),
  contractId: z.string().uuid().optional(),
  allowedProjectIds: z.array(z.string().uuid()),
  permissions: z.object({
    canViewPhotos: z.boolean().default(true),
    canViewDocuments: z.boolean().default(true),
    canComment: z.boolean().default(true),
    canSignActs: z.boolean().default(false),
    canViewCosts: z.boolean().default(false),
  }),
  signatureMethod: z.enum(['SMS', 'EMAIL_CONFIRM', 'SIMPLE_ECP', 'NONE']).default('EMAIL_CONFIRM'),
});

export type GuestScope = z.infer<typeof guestScopeSchema>;

export const DEFAULT_GUEST_SCOPE: GuestScope = {
  scope: 'FULL',
  allowedProjectIds: [],
  permissions: {
    canViewPhotos: true,
    canViewDocuments: true,
    canComment: true,
    canSignActs: false,
    canViewCosts: false,
  },
  signatureMethod: 'EMAIL_CONFIRM',
};
