import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createContractSchema } from '@/lib/validations/contract';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка что проект принадлежит организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) {
      return errorResponse('Проект не найден', 404);
    }

    const contracts = await db.contract.findMany({
      where: { projectId: params.projectId },
      include: {
        participants: {
          include: { organization: { select: { name: true } } },
        },
        category: { select: { id: true, name: true } },
        _count: { select: { subContracts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Считаем освоенную сумму по КС-2 для каждого договора
    const contractIds = contracts.map((c) => c.id);
    const ks2Sums = await db.ks2Act.groupBy({
      by: ['contractId'],
      where: { contractId: { in: contractIds } },
      _sum: { totalAmount: true },
    });
    const ks2SumMap = new Map(ks2Sums.map((s) => [s.contractId, s._sum.totalAmount ?? 0]));

    const result = contracts.map((c) => ({
      ...c,
      ks2Sum: ks2SumMap.get(c.id) ?? null,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения договоров');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка что проект принадлежит организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) {
      return errorResponse('Проект не найден', 404);
    }

    const body = await req.json();
    const parsed = createContractSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { startDate, endDate, ...rest } = parsed.data;

    // Авторасчёт НДС при наличии обоих значений
    const vatAmount =
      rest.vatRate != null && rest.totalAmount != null
        ? rest.totalAmount * rest.vatRate / 100
        : undefined;

    const contract = await db.contract.create({
      data: {
        ...rest,
        ...(vatAmount !== undefined && { vatAmount }),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId: params.projectId,
      },
    });

    return successResponse(contract);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
