import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, 'Введите название организации').optional(),
  inn: z.string().min(10).max(12).optional(),
  ogrn: z.string().optional().nullable(),
  sroName: z.string().optional().nullable(),
  sroNumber: z.string().optional().nullable(),
  sroInn: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.email('Некорректный email').optional().nullable(),
});

export const inviteEmployeeSchema = z.object({
  email: z.email('Введите корректный email'),
  role: z.enum(['ADMIN', 'MANAGER', 'WORKER', 'CONTROLLER', 'CUSTOMER']),
  position: z.string().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
