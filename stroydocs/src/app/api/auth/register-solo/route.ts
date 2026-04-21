import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { soloRegisterSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/utils/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPersonalWorkspace } from '@/lib/workspaces/create-workspace';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`register-solo:${ip}`, 5, 60 * 1000)) {
      return errorResponse('Слишком много запросов, попробуйте позже', 429);
    }

    const body = await req.json();
    const parsed = soloRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { email, password, firstName, lastName } = parsed.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse('Пользователь с таким email уже существует', 409);
    }

    const passwordHash = await hash(password, 12);

    const result = await db.$transaction(async (tx) => {
      // Персональная организация для solo-пользователя (без ИНН компании)
      const personalOrg = await tx.organization.create({
        data: {
          name: `${firstName} ${lastName}`,
          inn: `solo-${randomUUID()}`,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'WORKER',
          organizationId: personalOrg.id,
        },
      });

      const workspace = await createPersonalWorkspace(tx, user.id, firstName, lastName);

      return { user, workspaceId: workspace.id };
    });

    // Логируем ref_code cookie для будущей реферальной интеграции (Фаза 5)
    const refCode = req.cookies.get('ref_code')?.value;
    if (refCode) {
      logger.info({ userId: result.user.id, refCode }, 'Solo registration via referral code');
    }

    return successResponse({
      userId: result.user.id,
      activeWorkspaceId: result.workspaceId,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка solo-регистрации');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
