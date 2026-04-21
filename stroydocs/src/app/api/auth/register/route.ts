import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/utils/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createCompanyWorkspace } from '@/lib/workspaces/create-workspace';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 запросов в минуту на IP
    const ip = getClientIp(req);
    if (!checkRateLimit(`register:${ip}`, 5, 60 * 1000)) {
      return errorResponse('Слишком много запросов, попробуйте позже', 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { organizationName, inn, email, password, firstName, lastName } = parsed.data;

    // Проверка уникальности email
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse('Пользователь с таким email уже существует', 409);
    }

    // Проверка уникальности ИНН
    const existingOrg = await db.organization.findUnique({ where: { inn } });
    if (existingOrg) {
      return errorResponse('Организация с таким ИНН уже зарегистрирована', 409);
    }

    const passwordHash = await hash(password, 12);

    // Создание организации и администратора в транзакции
    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          inn,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'ADMIN',
          organizationId: organization.id,
        },
      });

      await createCompanyWorkspace(tx, user.id, organization.id, organization.name);

      return { organization, user };
    });

    return successResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        inn: result.organization.inn,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка регистрации');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
