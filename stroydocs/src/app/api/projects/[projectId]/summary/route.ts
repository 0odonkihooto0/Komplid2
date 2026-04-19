import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getCachedAnalytics } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params {
  projectId: string;
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    // Проверяем доступ к объекту
    const object = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        address: true,
        customer: true,
        generalContractor: true,
      },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const cacheKey = `summary:object:${projectId}`;

    const data = await getCachedAnalytics(cacheKey, async () => {
      const [
        contractTotals,
        factPayments,
        ganttTasks,
        ks2Approved,
        prescriptionGroups,
        executionDocGroups,
        designDocGroups,
        pirDocGroups,
        allObjects,
      ] = await Promise.all([
        // Сумма всех контрактов объекта
        db.contract.aggregate({
          where: { projectId: projectId },
          _sum: { totalAmount: true },
        }),

        // Фактические оплаты по контрактам
        db.contractPayment.aggregate({
          where: { contract: { projectId: projectId }, paymentType: 'FACT' },
          _sum: { amount: true },
        }),

        // Задачи ГПР из активных версий (для виджета "Выполнение по графикам")
        db.ganttTask.findMany({
          where: { version: { isActive: true, projectId: projectId } },
          select: { amount: true, progress: true },
        }),

        // Утверждённые акты КС-2 (для виджета "Освоение СМР")
        db.ks2Act.aggregate({
          where: { contract: { projectId: projectId }, status: 'APPROVED' },
          _sum: { totalAmount: true },
        }),

        // Предписания по статусам (через инспекцию → объект)
        db.prescription.groupBy({
          by: ['status'],
          where: { inspection: { projectId: projectId } },
          _count: { id: true },
          orderBy: { status: 'asc' },
        }),

        // Исполнительная документация по статусам
        db.executionDoc.groupBy({
          by: ['status'],
          where: { contract: { projectId: projectId } },
          _count: { id: true },
          orderBy: { status: 'asc' },
        }),

        // Проектная документация (ДокументыПИР) по статусам (без отменённых и удалённых)
        db.designDocument.groupBy({
          by: ['status'],
          where: {
            projectId: projectId,
            isDeleted: false,
            status: { not: 'CANCELLED' },
          },
          _count: { id: true },
          orderBy: { status: 'asc' },
        }),

        // Всего ПД (для счётчика освоения ПИР)
        db.designDocument.count({
          where: { projectId: projectId, isDeleted: false, status: { not: 'CANCELLED' } },
        }),

        // Все объекты организации для навигации ← →
        db.buildingObject.findMany({
          where: { organizationId: orgId },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // === Виджет 1: Оплачено по контрактам ===
      const contractsTotalAmount = contractTotals._sum.totalAmount ?? 0;
      const paidAmount = factPayments._sum.amount ?? 0;
      const contractsPercent =
        contractsTotalAmount > 0
          ? Math.round((paidAmount / contractsTotalAmount) * 100)
          : 0;

      // === Виджет 2: Выполнение по графикам (ГПР) ===
      let gprTotalAmount = 0;
      let gprCompletedAmount = 0;
      for (const task of ganttTasks) {
        const amt = task.amount ?? 0;
        gprTotalAmount += amt;
        gprCompletedAmount += amt * (task.progress / 100);
      }
      const gprPercent =
        gprTotalAmount > 0
          ? Math.round((gprCompletedAmount / gprTotalAmount) * 100)
          : 0;

      // === Виджет 3: Освоение ПИР (по документам ПД) ===
      const designDocMap: Record<string, number> = {};
      for (const row of designDocGroups) {
        designDocMap[row.status] = row._count.id;
      }
      const pirApproved = designDocMap['APPROVED'] ?? 0;
      const pirTotal = pirDocGroups;
      const pirPercent = pirTotal > 0 ? Math.round((pirApproved / pirTotal) * 100) : 0;

      // === Виджет 4: Освоение СМР (КС-2) ===
      const smrCompletedAmount = ks2Approved._sum.totalAmount ?? 0;
      const smrPercent =
        contractsTotalAmount > 0
          ? Math.round((smrCompletedAmount / contractsTotalAmount) * 100)
          : 0;

      // === Предписания ===
      const prescriptionMap: Record<string, number> = {};
      for (const row of prescriptionGroups) {
        prescriptionMap[row.status] = row._count.id;
      }

      // === ИД по статусам ===
      const execDocMap: Record<string, number> = {};
      for (const row of executionDocGroups) {
        execDocMap[row.status] = row._count.id;
      }
      const execDocTotal = Object.values(execDocMap).reduce((a, b) => a + b, 0);

      // === ПД по статусам ===
      const pdWithComments = designDocMap['WITH_COMMENTS'] ?? 0;
      const pdInApproval = designDocMap['IN_APPROVAL'] ?? 0;
      const pdReviewPassed = designDocMap['REVIEW_PASSED'] ?? 0;
      const pdApproved = designDocMap['APPROVED'] ?? 0;

      // === Навигация ← → по объектам организации ===
      const objectIds = allObjects.map((o) => o.id);
      const currentIndex = objectIds.indexOf(projectId);
      const prevObjectId =
        currentIndex > 0 ? objectIds[currentIndex - 1] ?? null : null;
      const nextObjectId =
        currentIndex !== -1 && currentIndex < objectIds.length - 1
          ? objectIds[currentIndex + 1] ?? null
          : null;

      return {
        object,
        contracts: {
          totalAmount: contractsTotalAmount,
          paidAmount,
          percent: contractsPercent,
        },
        gpr: {
          totalAmount: gprTotalAmount,
          completedAmount: gprCompletedAmount,
          percent: gprPercent,
        },
        pir: {
          total: pirTotal,
          completed: pirApproved,
          percent: pirPercent,
        },
        smr: {
          totalAmount: contractsTotalAmount,
          completedAmount: smrCompletedAmount,
          percent: smrPercent,
        },
        prescriptions: {
          active: prescriptionMap['ACTIVE'] ?? 0,
          closed: prescriptionMap['CLOSED'] ?? 0,
        },
        executionDocs: {
          rejected: execDocMap['REJECTED'] ?? 0,
          inReview: execDocMap['IN_REVIEW'] ?? 0,
          draft: execDocMap['DRAFT'] ?? 0,
          signed: execDocMap['SIGNED'] ?? 0,
          total: execDocTotal,
        },
        designDocs: {
          withComments: pdWithComments,
          inApproval: pdInApproval,
          reviewPassed: pdReviewPassed,
          approved: pdApproved,
          total: pirTotal,
        },
        prevObjectId,
        nextObjectId,
      };
    });

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сводки объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
