import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { UserIntent } from '@prisma/client';
import { soloRegisterSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/utils/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPersonalWorkspace } from '@/lib/workspaces/create-workspace';
import { checkReferralFraud } from '@/lib/referrals/anti-fraud';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`register-solo:${ip}`, 5, 60 * 1000)) {
      return errorResponse('Слишком много запросов, попробуйте позже', 429);
    }

    // Читать signupContext cookie (устанавливается при переходе с лендингов)
    const signupContextRaw = req.cookies.get('signup_context')?.value;
    let signupCtx: {
      plan?: string;
      intent?: string;
      referredByCode?: string;
      signupSource?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
    } = {};
    if (signupContextRaw) {
      try {
        signupCtx = JSON.parse(signupContextRaw) as typeof signupCtx;
      } catch {
        // невалидный JSON игнорируем
      }
    }

    // Проверяем intent на соответствие enum UserIntent
    const validIntent =
      signupCtx.intent && Object.values(UserIntent).includes(signupCtx.intent as UserIntent)
        ? (signupCtx.intent as UserIntent)
        : undefined;

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
          // Поля из signupContext (UTM, источник, intent)
          ...(validIntent && { intent: validIntent }),
          ...(signupCtx.signupSource && { signupSource: signupCtx.signupSource }),
          ...(signupCtx.referredByCode && { referredByCode: signupCtx.referredByCode }),
          ...(signupCtx.utmSource && { utmSource: signupCtx.utmSource }),
          ...(signupCtx.utmMedium && { utmMedium: signupCtx.utmMedium }),
          ...(signupCtx.utmCampaign && { utmCampaign: signupCtx.utmCampaign }),
          ...(signupCtx.utmContent && { utmContent: signupCtx.utmContent }),
          ...(signupCtx.utmTerm && { utmTerm: signupCtx.utmTerm }),
          // Хэш IP (не хранить сырой IP — ФЗ-152)
          ...(ip && { signupIpHash: Buffer.from(ip).toString('base64') }),
          firstTouchAt: new Date(),
        },
      });

      const workspace = await createPersonalWorkspace(tx, user.id, firstName, lastName);

      return { user, workspaceId: workspace.id };
    });

    // Фаза 5: реферальная интеграция — связать нового пользователя с referral
    const refCode = req.cookies.get('ref_code')?.value;
    const refReferralId = req.cookies.get('ref_referral_id')?.value;
    if (refCode && refReferralId) {
      try {
        const codeRecord = await db.referralCode.findUnique({ where: { code: refCode } });
        if (codeRecord && codeRecord.userId !== result.user.id) {
          const referrer = await db.user.findUnique({
            where: { id: codeRecord.userId },
            select: { email: true },
          });
          const fraudCheck = await checkReferralFraud({
            referrerId: codeRecord.userId,
            referredEmail: email,
            referrerEmail: referrer?.email ?? '',
            signupIp: getClientIp(req),
          });

          await db.referral.update({
            where: { id: refReferralId },
            data: {
              referredUserId: result.user.id,
              signupAt: new Date(),
              signupIp: getClientIp(req),
              suspicious: fraudCheck.suspicious,
              fraudReasons: fraudCheck.reasons,
            },
          });
          await db.referralCode.update({
            where: { id: codeRecord.id },
            data: { signupCount: { increment: 1 } },
          });
        }
      } catch (refErr) {
        // Не блокируем регистрацию при ошибке реферального трекинга
        logger.warn({ err: refErr }, 'Ошибка реферального трекинга при регистрации');
      }
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
