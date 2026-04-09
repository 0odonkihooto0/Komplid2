import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { fillPIRClosureSchema } from '@/lib/validations/pir-closure';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; actId: string } };

// POST — заполнить позиции акта закрытия ПИР (ручной ввод; автозаполнение из ГПР — в Модуле 7)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const act = await db.pIRClosureAct.findFirst({
      where: {
        id: params.actId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true },
    });
    if (!act) return errorResponse('Акт закрытия не найден', 404);

    if (act.status !== 'DRAFT') {
      return errorResponse('Нельзя изменить позиции уже проведённого акта', 409);
    }

    const body = await req.json();
    const parsed = fillPIRClosureSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    type ClosureItem = { workName: string; unit?: string; volume?: number; amount?: number };
    const items: ClosureItem[] = parsed.data.items as ClosureItem[];
    const totalAmount = items.reduce((sum: number, item: ClosureItem) => sum + (item.amount ?? 0), 0);

    // Транзакция: удалить старые позиции, создать новые, обновить итог
    await db.$transaction([
      db.pIRClosureItem.deleteMany({ where: { actId: params.actId } }),
      db.pIRClosureItem.createMany({
        data: items.map((item: ClosureItem) => ({
          actId: params.actId,
          workName: item.workName,
          unit: item.unit ?? null,
          volume: item.volume ?? null,
          amount: item.amount ?? null,
        })),
      }),
      db.pIRClosureAct.update({
        where: { id: params.actId },
        data: { totalAmount },
      }),
    ]);

    // Вернуть обновлённый акт с позициями
    const updated = await db.pIRClosureAct.findFirst({
      where: { id: params.actId },
      include: {
        items: { orderBy: { id: 'asc' } },
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка заполнения позиций акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
