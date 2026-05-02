import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const schema = z.object({
  enabled: z.boolean(),
  hideCosts: z.boolean().optional(),
  hidePhotoIds: z.array(z.string()).optional(),
  hideAddress: z.boolean().optional(),
  hideDefects: z.boolean().optional(),
  onlyCompletedStages: z.boolean().optional(),
  expiresInDays: z.number().nullable().optional(),
  allowIndexing: z.boolean().optional(),
});

// POST — включить или отключить публичный доступ к дашборду объекта
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем что объект принадлежит организации текущего пользователя
    const obj = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!obj) return errorResponse('Не найдено', 404);

    // Разбираем и валидируем тело запроса
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Неверные параметры', 400);
    }
    const body = parsed.data;

    if (body.enabled) {
      // Вычисляем срок действия токена
      const expiresAt =
        body.expiresInDays != null
          ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

      // Настройки отображения для публичного дашборда
      const customSettings: Prisma.InputJsonValue = {
        hideCosts: body.hideCosts ?? true,
        hidePhotoIds: body.hidePhotoIds ?? [],
        hideAddress: body.hideAddress ?? false,
        hideDefects: body.hideDefects ?? false,
        onlyCompletedStages: body.onlyCompletedStages ?? false,
      };

      // Ищем существующий активный токен PROJECT_DASHBOARD
      let portalToken = await db.projectPortalToken.findFirst({
        where: {
          projectId: params.projectId,
          scopeType: 'PROJECT_DASHBOARD',
          revokedAt: null,
        },
      });

      if (!portalToken) {
        // Создаём новый токен если активного нет
        portalToken = await db.projectPortalToken.create({
          data: {
            token: randomUUID(),
            projectId: params.projectId,
            createdById: session.user.id,
            scopeType: 'PROJECT_DASHBOARD',
            allowIndexing: body.allowIndexing ?? false,
            customSettings,
            expiresAt,
          },
        });
      } else {
        // Обновляем существующий токен с новыми настройками
        portalToken = await db.projectPortalToken.update({
          where: { id: portalToken.id },
          data: {
            allowIndexing: body.allowIndexing ?? portalToken.allowIndexing,
            customSettings,
            expiresAt,
          },
        });
      }

      // Включаем публичный дашборд на объекте
      await db.buildingObject.update({
        where: { id: params.projectId },
        data: { publicDashboardEnabled: true },
      });

      return successResponse({
        token: portalToken.token,
        publicUrl: `${process.env.APP_URL}/portal/${portalToken.token}`,
      });
    } else {
      // Отзываем все активные токены для этого объекта
      await db.projectPortalToken.updateMany({
        where: { projectId: params.projectId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedById: session.user.id,
          revokedReason: 'Публичный доступ отключён пользователем',
        },
      });

      // Выключаем публичный дашборд на объекте
      await db.buildingObject.update({
        where: { id: params.projectId },
        data: { publicDashboardEnabled: false },
      });

      return successResponse({ ok: true });
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка управления публичностью объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
