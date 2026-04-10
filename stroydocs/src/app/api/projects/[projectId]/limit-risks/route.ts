import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  federalBudget: z.number().min(0).default(0),
  regionalBudget: z.number().min(0).default(0),
  localBudget: z.number().min(0).default(0),
  ownFunds: z.number().min(0).default(0),
  extraBudget: z.number().min(0).default(0),
  riskReason: z.string().min(1, 'Укажите причину риска'),
  resolutionProposal: z.string().optional(),
  completionDate: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
});

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// GET — список рисков неосвоения лимитов с привязкой к договору
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const risks = await db.limitRisk.findMany({
      where: { projectId: params.projectId },
      include: {
        contract: { select: { id: true, number: true, name: true } },
      },
      orderBy: [{ year: 'asc' }, { createdAt: 'desc' }],
    });

    return successResponse(risks);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения рисков неосвоения лимитов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST — создание риска неосвоения лимитов
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const {
      federalBudget,
      regionalBudget,
      localBudget,
      ownFunds,
      extraBudget,
      completionDate,
      contractId,
      ...rest
    } = parsed.data;

    // Сумма рассчитывается автоматически как сумма всех источников финансирования
    const totalAmount = federalBudget + regionalBudget + localBudget + ownFunds + extraBudget;

    const risk = await db.limitRisk.create({
      data: {
        ...rest,
        federalBudget,
        regionalBudget,
        localBudget,
        ownFunds,
        extraBudget,
        totalAmount,
        projectId: params.projectId,
        contractId: contractId ?? null,
        completionDate: completionDate ? new Date(completionDate) : null,
      },
      include: {
        contract: { select: { id: true, number: true, name: true } },
      },
    });

    return successResponse(risk);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания риска неосвоения лимитов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
