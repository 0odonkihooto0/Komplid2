import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string } };

const createKs2Schema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

/** GET — список актов КС-2 по договору */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where = { contractId: params.contractId };

    const [acts, total] = await Promise.all([
      db.ks2Act.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          ks3Certificate: { select: { id: true, status: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.ks2Act.count({ where }),
    ]);

    return successResponse({ data: acts, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения актов КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать акт КС-2 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createKs2Schema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Генерация номера акта
    const count = await db.ks2Act.count({ where: { contractId: params.contractId } });
    const number = `КС-2-${String(count + 1).padStart(3, '0')}`;

    const act = await db.ks2Act.create({
      data: {
        number,
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
        contractId: params.contractId,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    return successResponse(act);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания акта КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
