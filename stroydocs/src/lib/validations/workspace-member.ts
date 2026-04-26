import { z } from 'zod';
import { WorkspaceRole } from '@prisma/client';

// Роли, которые можно назначить при приглашении члена команды (OWNER назначается только через передачу)
const INVITABLE_ROLES = ['ADMIN', 'MANAGER', 'ENGINEER', 'FOREMAN', 'WORKER'] as const;
const GUEST_ROLES = ['GUEST', 'CUSTOMER'] as const;

export const inviteMemberSchema = z.object({
  email: z.email('Введите корректный email'),
  role: z.enum(INVITABLE_ROLES),
  specialization: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  personalMessage: z.string().max(500).optional(),
});

export const inviteGuestSchema = z.object({
  email: z.email('Введите корректный email'),
  role: z.enum(GUEST_ROLES),
  specialization: z.string().max(100).optional(),
  guestScope: z
    .object({
      permissions: z
        .object({
          canViewCosts: z.boolean().default(false),
          canSignActs: z.boolean().default(false),
        })
        .optional(),
    })
    .optional(),
});

export const updateMemberSchema = z.object({
  role: z.nativeEnum(WorkspaceRole).optional(),
  specialization: z.string().max(100).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  deactivationReason: z.string().max(500).optional(),
  // id WorkspaceMember нового OWNER — обязателен если снимается/деактивируется текущий OWNER
  transferOwnershipTo: z.string().min(1).optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type InviteGuestInput = z.infer<typeof inviteGuestSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
