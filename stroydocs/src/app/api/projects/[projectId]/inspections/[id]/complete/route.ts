import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; id: string }

// POST /api/projects/[projectId]/inspections/[id]/complete — завершить проверку
// Ключевая бизнес-логика по ЦУС стр. 274–275:
// 1. Проверить заполненность полей
// 2. Установить статус COMPLETED
// 3. Создать акт проверки и предписания (группировка по requiresSuspension)
// 4. Уведомить ответственного
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    // Проверяем доступ к объекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загружаем проверку с дефектами
    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: orgId } },
      include: { defects: true },
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);
    if (inspection.status === 'COMPLETED') {
      return errorResponse('Проверка уже завершена', 400);
    }

    // Проверяем обязательные поля перед завершением
    if (!inspection.responsibleId) {
      return errorResponse('Укажите ответственного перед завершением проверки', 400);
    }
    if (inspection.contractorPresent === null || inspection.contractorPresent === undefined) {
      return errorResponse('Укажите присутствие подрядчика перед завершением проверки', 400);
    }

    const now = new Date();
    const defects = inspection.defects;

    // Подсчитываем существующие акты и предписания для автонумерации
    const [actsCount, prescriptionsCount] = await Promise.all([
      db.inspectionAct.count({ where: { inspection: { projectId } } }),
      db.prescription.count({ where: { inspection: { projectId } } }),
    ]);

    // Выполняем всё в транзакции
    await db.$transaction(async (tx) => {
      // 1. Завершаем проверку
      const completedInspection = await tx.inspection.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });

      // 2. Если есть дефекты — создаём акт проверки и предписания
      if (defects.length > 0) {
        // Создаём акт проверки
        await tx.inspectionAct.create({
          data: {
            number: `АП-${String(actsCount + 1).padStart(3, '0')}`,
            inspectionId: id,
            issuedById: session.user.id,
            issuedAt: now,
          },
        });

        // Группируем дефекты по requiresSuspension
        const defectsForElimination = defects.filter((d) => !d.requiresSuspension);
        const defectsForSuspension = defects.filter((d) => d.requiresSuspension);

        let prescriptionIndex = prescriptionsCount;

        // Предписание на устранение недостатков
        if (defectsForElimination.length > 0) {
          prescriptionIndex++;
          const prescription = await tx.prescription.create({
            data: {
              number: `ПР-УН-${String(prescriptionIndex).padStart(3, '0')}`,
              type: 'DEFECT_ELIMINATION',
              inspectionId: id,
              issuedById: session.user.id,
              responsibleId: inspection.responsibleId,
              issuedAt: now,
            },
          });

          // Привязываем дефекты к предписанию
          await tx.defect.updateMany({
            where: { id: { in: defectsForElimination.map((d) => d.id) } },
            data: { prescriptionId: prescription.id },
          });
        }

        // Предписание на приостановку работ
        if (defectsForSuspension.length > 0) {
          prescriptionIndex++;
          const prescription = await tx.prescription.create({
            data: {
              number: `ПР-ПР-${String(prescriptionIndex).padStart(3, '0')}`,
              type: 'WORK_SUSPENSION',
              inspectionId: id,
              issuedById: session.user.id,
              responsibleId: inspection.responsibleId,
              issuedAt: now,
            },
          });

          // Привязываем дефекты к предписанию
          await tx.defect.updateMany({
            where: { id: { in: defectsForSuspension.map((d) => d.id) } },
            data: { prescriptionId: prescription.id },
          });
        }
      }

      // 3. Уведомляем ответственного
      if (inspection.responsibleId) {
        await tx.notification.create({
          data: {
            type: 'inspection_completed',
            title: 'Проверка завершена',
            body: `Проверка №${inspection.number} завершена. Обнаружено недостатков: ${defects.length}`,
            userId: inspection.responsibleId,
            entityType: 'Inspection',
            entityId: id,
            entityName: `Проверка №${inspection.number}`,
          },
        });
      }

      return completedInspection;
    });

    await invalidateAnalyticsCache(projectId, orgId);

    // Возвращаем обновлённую проверку со связями
    const updatedInspection = await db.inspection.findUnique({
      where: { id },
      include: {
        inspector: { select: { id: true, firstName: true, lastName: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { defects: true, prescriptions: true, inspectionActs: true } },
      },
    });

    return successResponse(updatedInspection);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка завершения проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
