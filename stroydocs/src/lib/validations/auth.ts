import { z } from 'zod';

// Bcrypt обрезает пароли длиннее 72 символов — лишние байты игнорируются.
// Ограничение .max(72) на уровне Zod защищает от DoS: злоумышленник не сможет
// отправить 1МБ строку и загрузить CPU бесконечным хэшированием.
const passwordSchema = z
  .string()
  .min(6, 'Минимум 6 символов')
  .max(72, 'Пароль не может быть длиннее 72 символов');

export const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: passwordSchema,
});

export const registerSchema = z.object({
  // Данные организации
  organizationName: z.string().min(2, 'Введите название организации'),
  inn: z.string().min(10, 'ИНН должен содержать 10 или 12 цифр').max(12),
  // Данные пользователя
  email: z.email('Введите корректный email'),
  password: passwordSchema,
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
});

export const soloRegisterSchema = z.object({
  email: z.email('Введите корректный email'),
  password: passwordSchema,
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SoloRegisterInput = z.infer<typeof soloRegisterSchema>;
