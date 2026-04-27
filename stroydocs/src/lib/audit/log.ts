import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';

export interface AuditLogParams {
  /** Код события: "member.invited", "auth.signin", "subscription.upgraded", ... */
  action: string;
  /** ID пользователя-исполнителя (null — системное событие) */
  actorUserId?: string;
  /** ID воркспейса, к которому относится событие */
  workspaceId?: string;
  /** Тип затронутого ресурса: "User", "Workspace", "Project", "Subscription", ... */
  resourceType?: string;
  /** ID затронутого ресурса */
  resourceId?: string;
  /** Состояние до изменения (для diff-просмотра) */
  before?: unknown;
  /** Состояние после изменения */
  after?: unknown;
  /** NextRequest для извлечения IP и User-Agent */
  request?: NextRequest;
}

/**
 * Записывает событие в журнал аудита.
 * Никогда не бросает ошибку — аудит не должен ломать основную операцию.
 * Используйте void logAudit(...) чтобы не блокировать ответ API.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress =
      params.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      params.request?.headers.get('x-real-ip') ??
      null;
    const userAgent = params.request?.headers.get('user-agent') ?? null;

    await db.auditLog.create({
      data: {
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        workspaceId: params.workspaceId ?? null,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        before:
          params.before !== undefined
            ? (params.before as Prisma.InputJsonValue)
            : undefined,
        after:
          params.after !== undefined
            ? (params.after as Prisma.InputJsonValue)
            : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Не пробрасываем ошибку — пишем в logger и продолжаем
    logger.error({ err }, `[audit] Ошибка записи события: ${params.action}`);
  }
}
