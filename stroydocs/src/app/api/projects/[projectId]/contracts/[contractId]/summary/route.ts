import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string };

// Вспомогательная: проверить доступ к договору
async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

// Получить сводку по договору: документы, платежи, суммы
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    // Параллельно получаем количество связанных документов и платежи
    const [execDocsCount, archiveCount, ks2Count, payments] = await Promise.all([
      db.executionDoc.count({ where: { contractId: params.contractId } }),
      db.archiveDocument.count({ where: { contractId: params.contractId } }),
      db.ks2Act.count({ where: { contractId: params.contractId } }),
      db.contractPayment.findMany({
        where: { contractId: params.contractId },
        select: { paymentType: true, amount: true },
      }),
    ]);

    const count = execDocsCount + archiveCount + ks2Count;
    const totalAmount = contract.totalAmount ?? 0;

    // Суммируем плановые и фактические платежи
    const plannedTotal = payments
      .filter((p) => p.paymentType === 'PLAN')
      .reduce((s, p) => s + p.amount, 0);
    const factTotal = payments
      .filter((p) => p.paymentType === 'FACT')
      .reduce((s, p) => s + p.amount, 0);

    return successResponse({ count, totalAmount, plannedTotal, factTotal });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сводки по договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
