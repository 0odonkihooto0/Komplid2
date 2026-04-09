import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createPIRClosureSchema } from '@/lib/validations/pir-closure';
import { getNextPIRClosureNumber } from '@/lib/numbering';
import type { PIRClosureStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') as PIRClosureStatus | null;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      projectId: params.objectId,
      ...(status && { status }),
    };

    const [acts, total] = await Promise.all([
      db.pIRClosureAct.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.pIRClosureAct.count({ where }),
    ]);

    return successResponse({ data: acts, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения актов закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createPIRClosureSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const number = await getNextPIRClosureNumber(params.objectId);

    const act = await db.pIRClosureAct.create({
      data: {
        number,
        status: 'DRAFT',
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
        contractorOrgId: parsed.data.contractorOrgId ?? null,
        customerOrgId: parsed.data.customerOrgId ?? null,
        totalAmount: parsed.data.totalAmount ?? null,
        projectId: params.objectId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    return successResponse(act);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
