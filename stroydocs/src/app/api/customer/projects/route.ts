export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse, handleApiError } from '@/utils/api';
import { requireFeature, hasFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  address: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) return errorResponse('Доступ запрещён', 403);

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
    const skip = Number(searchParams.get('skip') ?? '0');

    // Получаем список проектов (объектов строительства) в воркспейсе с пагинацией
    const [projects, total] = await Promise.all([
      db.buildingObject.findMany({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          name: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.buildingObject.count({ where: { workspaceId: ws.id } }),
    ]);

    return successResponse({ projects, total }, { page: Math.floor(skip / limit) + 1, pageSize: limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) return errorResponse('Доступ запрещён', 403);

    const body = await req.json().catch(() => ({}));
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, address, description } = parsed.data;

    // Проверяем лимит проектов: без тарифа Pro — максимум 1 проект
    const hasUnlimited = await hasFeature(ws.id, FEATURE_CODES.CUSTOMER_UNLIMITED_PROJECTS);
    if (!hasUnlimited) {
      const existingCount = await db.buildingObject.count({ where: { workspaceId: ws.id } });
      if (existingCount >= 1) {
        return errorResponse('Лимит проектов достигнут. Перейдите на Pro.', 402);
      }
    }

    // Создаём объект строительства в воркспейсе пользователя
    const project = await db.buildingObject.create({
      data: {
        name,
        address,
        description,
        organizationId: session.user.organizationId,
        workspaceId: ws.id,
        status: 'ACTIVE',
      },
    });

    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}
