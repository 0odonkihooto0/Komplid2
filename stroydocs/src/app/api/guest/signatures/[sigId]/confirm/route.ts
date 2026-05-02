import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';

export const dynamic = 'force-dynamic';

// Схема тела POST-запроса
const confirmSchema = z.object({
  code: z.string().length(6, 'Код должен состоять из 6 цифр'),
});

export async function POST(
  req: Request,
  { params }: { params: { sigId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const activeWorkspaceId = session.user.activeWorkspaceId;
    if (!activeWorkspaceId) return errorResponse('Нет активного workspace', 403);

    // Проверка что пользователь — гость в этом workspace
    const member = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: activeWorkspaceId },
    });
    if (!member || member.role !== 'GUEST') return errorResponse('Нет доступа', 403);

    // Разбираем scope для валидности сессии
    guestScopeSchema.parse(member.guestScope);

    // Загружаем подпись и проверяем принадлежность к пользователю
    const sig = await db.guestSignature.findFirst({
      where: {
        id: params.sigId,
        workspaceId: activeWorkspaceId,
      },
    });

    if (!sig) return errorResponse('Запись подписи не найдена', 404);

    // Только сам подписант может подтвердить свою подпись
    if (sig.signerUserId !== session.user.id) {
      return errorResponse('Нет доступа к этой подписи', 403);
    }

    // Проверка что подпись ещё не подтверждена и не истекла
    if (sig.status !== 'PENDING') {
      return errorResponse('Подпись уже обработана или отклонена', 400);
    }

    if (!sig.confirmationExpiresAt || sig.confirmationExpiresAt < new Date()) {
      // Помечаем как истекшую
      await db.guestSignature.update({
        where: { id: sig.id },
        data: { status: 'EXPIRED' },
      });
      return errorResponse('Срок действия кода истёк', 400);
    }

    // Валидация тела запроса
    const body = await req.json() as unknown;
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Проверяем код через bcrypt
    if (!sig.confirmationCodeHash) {
      return errorResponse('Хэш кода не найден — повторите инициацию подписи', 400);
    }

    const { compare } = await import('bcryptjs');
    const valid = await compare(parsed.data.code, sig.confirmationCodeHash);

    if (!valid) {
      return errorResponse('Неверный код', 400);
    }

    // Извлекаем IP и User-Agent из заголовков запроса
    const reqHeaders = req instanceof Request ? req.headers : new Headers();
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? reqHeaders.get('x-real-ip')
      ?? 'unknown';
    const userAgent = reqHeaders.get('user-agent') ?? 'unknown';

    const confirmedAt = new Date();

    // Аудит-трейл: добавляем запись о подтверждении к существующему трейлу
    const existingAudit = Array.isArray(sig.auditTrail) ? sig.auditTrail : [];
    const newAuditEntry = {
      ts: confirmedAt.toISOString(),
      action: 'CONFIRMED',
      ipAddress,
      userAgent,
    };

    // Обновляем подпись: статус CONFIRMED + аудит
    await db.guestSignature.update({
      where: { id: sig.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt,
        ipAddress,
        auditTrail: [...existingAudit, newAuditEntry] as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    // Уведомляем владельца workspace о подписании документа
    const owner = await db.workspaceMember.findFirst({
      where: { workspaceId: sig.workspaceId, role: 'OWNER' },
      include: { user: { select: { id: true } } },
    });

    if (owner) {
      await db.notification.create({
        data: {
          userId: owner.user.id,
          type: 'GUEST_DOCUMENT_SIGNED',
          title: 'Документ подписан гостем',
          body: 'Гость подписал документ',
        },
      });
    }

    return successResponse({ success: true, confirmedAt });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка подтверждения подписи гостем');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
