export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { HiddenWorkType } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse, handleApiError } from '@/utils/api';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';

type Params = { params: { projectId: string } };

const checklistItemSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const createChecklistSchema = z.object({
  workType: z.nativeEnum(HiddenWorkType),
  title: z.string().min(1, 'Название обязательно').max(300),
  items: z.array(checklistItemSchema).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (мультитенантная изоляция)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Не найдено', 404);

    // Проверяем наличие фичи в тарифе (бросает PaymentRequiredError → 402)
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_HIDDEN_WORKS_CHECKLISTS);

    // Возвращаем чек-листы проекта с позициями, отсортированными по sortOrder
    const checklists = await db.hiddenWorksChecklist.findMany({
      where: { projectId: params.projectId, workspaceId: ws.id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(checklists);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (мультитенантная изоляция)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Не найдено', 404);

    // Проверяем наличие фичи в тарифе (бросает PaymentRequiredError → 402)
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_HIDDEN_WORKS_CHECKLISTS);

    const body = await req.json().catch(() => ({}));
    const parsed = createChecklistSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { workType, title, items } = parsed.data;

    // Создаём чек-лист и его позиции в одной транзакции для атомарности
    const checklist = await db.$transaction(async (tx) => {
      const c = await tx.hiddenWorksChecklist.create({
        data: {
          workspaceId: ws.id,
          projectId: params.projectId,
          workType,
          title,
          status: 'PENDING',
        },
      });

      // Создаём позиции чек-листа пакетно если они переданы
      if (items && items.length > 0) {
        await tx.checklistItem.createMany({
          data: items.map((item, i) => ({
            checklistId: c.id,
            title: item.title,
            description: item.description,
            isRequired: item.isRequired ?? false,
            sortOrder: item.sortOrder ?? i,
          })),
        });
      }

      // Возвращаем чек-лист вместе с созданными позициями
      return tx.hiddenWorksChecklist.findUnique({
        where: { id: c.id },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    return successResponse(checklist);
  } catch (error) {
    return handleApiError(error);
  }
}
