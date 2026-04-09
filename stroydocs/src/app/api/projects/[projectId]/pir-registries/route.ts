import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createPIRRegistrySchema } from '@/lib/validations/pir-registry';
import { getNextPIRRegistryNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = { projectId: params.projectId };

    const [registries, total] = await Promise.all([
      db.pIRRegistry.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          senderOrg: { select: { id: true, name: true } },
          receiverOrg: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.pIRRegistry.count({ where }),
    ]);

    return successResponse({ data: registries, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения реестров ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createPIRRegistrySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const number = await getNextPIRRegistryNumber(params.projectId);

    const registry = await db.pIRRegistry.create({
      data: {
        number,
        senderOrgId: parsed.data.senderOrgId ?? null,
        receiverOrgId: parsed.data.receiverOrgId ?? null,
        senderPersonId: parsed.data.senderPersonId ?? null,
        receiverPersonId: parsed.data.receiverPersonId ?? null,
        notes: parsed.data.notes ?? null,
        projectId: params.projectId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    return successResponse(registry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания реестра ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
