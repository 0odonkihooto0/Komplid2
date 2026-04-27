import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CONSTRUCTION_TYPES = [
  'Квартира / Апартаменты',
  'Частный дом',
  'Коммерческий объект',
  'Промышленный объект',
  'Инфраструктурный объект',
  'Другое',
] as const;

const schema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  address: z.string().max(500).optional(),
  constructionType: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Неверные данные', 400, parsed.error.issues);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { activeWorkspaceId: true, organizationId: true },
  });

  const workspaceId = user?.activeWorkspaceId ?? session.user.activeWorkspaceId ?? undefined;
  const organizationId = user?.organizationId ?? session.user.organizationId;

  if (!organizationId) return errorResponse('Организация не найдена', 400);

  try {
    const project = await db.buildingObject.create({
      data: {
        name: parsed.data.name,
        address: parsed.data.address,
        constructionType: parsed.data.constructionType,
        organizationId,
        ...(workspaceId ? { workspaceId } : {}),
        ...(parsed.data.startDate ? { plannedStartDate: new Date(parsed.data.startDate) } : {}),
        ...(parsed.data.plannedEndDate ? { plannedEndDate: new Date(parsed.data.plannedEndDate) } : {}),
      },
    });

    await db.user.update({
      where: { id: session.user.id },
      data: { onboardingStep: 'FIRST_PROJECT_CREATED' },
    });

    return successResponse({ projectId: project.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ err: error, organizationId, workspaceId: workspaceId ?? null }, 'Ошибка создания первого проекта при онбординге');
    // В dev-режиме раскрываем детали чтобы легче диагностировать
    const detail = process.env.NODE_ENV === 'development' ? msg : undefined;
    return errorResponse('Не удалось создать проект', 500, detail ? [{ message: detail }] : undefined);
  }
}

// Пропустить шаг
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: 'FIRST_PROJECT_CREATED' },
  });

  return successResponse({ skipped: true });
}
