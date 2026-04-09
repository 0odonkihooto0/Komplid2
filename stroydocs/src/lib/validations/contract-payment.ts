import { z } from 'zod';

export const createContractPaymentSchema = z.object({
  paymentType: z.enum(['PLAN', 'FACT']),
  amount: z.number().positive('Сумма должна быть положительной'),
  paymentDate: z.string().min(1, 'Дата платежа обязательна'),
  budgetType: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export type CreateContractPaymentInput = z.infer<typeof createContractPaymentSchema>;
