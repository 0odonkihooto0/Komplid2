import { z } from 'zod';
import { ProjectRole, ProjectMemberPolicy } from '@prisma/client';

export const assignProjectMemberSchema = z.object({
  workspaceMemberId: z.string().min(1, 'Укажите участника'),
  projectRole: z.nativeEnum(ProjectRole, { error: 'Неверная роль в проекте' }),
  notes: z.string().max(500).optional(),
});

export const updateProjectMemberSchema = z.object({
  projectRole: z.nativeEnum(ProjectRole).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateProjectPolicySchema = z.object({
  memberPolicy: z.nativeEnum(ProjectMemberPolicy, { error: 'Неверная политика доступа' }),
});

export type AssignProjectMemberInput = z.infer<typeof assignProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberSchema>;
export type UpdateProjectPolicyInput = z.infer<typeof updateProjectPolicySchema>;
