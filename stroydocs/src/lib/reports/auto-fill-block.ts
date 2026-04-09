import { db } from '@/lib/db';
import { type ReportBlock, type Report, ReportBlockType } from '@prisma/client';

/**
 * Автозаполнение блока отчёта данными из БД.
 * Возвращает объект с данными, специфичными для типа блока.
 */
export async function autoFillBlock(
  block: ReportBlock,
  projectId: string,
  report: Pick<Report, 'periodStart' | 'periodEnd'>
): Promise<Record<string, unknown>> {
  // Фильтр по дате для полей типа DateTime (WorkRecord.date, DailyLog.date)
  const dateRangeFilter =
    report.periodStart && report.periodEnd
      ? { gte: report.periodStart, lte: report.periodEnd }
      : undefined;

  switch (block.type) {
    case ReportBlockType.TITLE_PAGE: {
      // Данные объекта строительства для титульного листа
      const obj = await db.buildingObject.findUnique({
        where: { id: projectId },
        select: {
          name: true,
          address: true,
          generalContractor: true,
          customer: true,
          plannedStartDate: true,
          plannedEndDate: true,
          permitNumber: true,
        },
      });
      return {
        objectName: obj?.name ?? '',
        address: obj?.address ?? '',
        generalContractor: obj?.generalContractor ?? '',
        customer: obj?.customer ?? '',
        periodStart: report.periodStart?.toISOString() ?? null,
        periodEnd: report.periodEnd?.toISOString() ?? null,
        permitNumber: obj?.permitNumber ?? '',
      };
    }

    case ReportBlockType.WORK_VOLUMES: {
      // Записи о работах за период с наименованием и единицей измерения
      const records = await db.workRecord.findMany({
        where: {
          contract: { projectId },
          ...(dateRangeFilter ? { date: dateRangeFilter } : {}),
        },
        include: {
          workItem: { select: { name: true, unit: true } },
        },
        orderBy: { date: 'asc' },
        take: 200,
      });
      return {
        rows: records.map((r) => ({
          date: r.date.toISOString(),
          workName: r.workItem.name,
          unit: r.workItem.unit ?? '',
          location: r.location,
          description: r.description ?? '',
        })),
        total: records.length,
      };
    }

    case ReportBlockType.KS2_ACTS: {
      // Акты КС-2 за период: фильтр по periodStart/periodEnd акта
      const ks2Where = report.periodStart && report.periodEnd
        ? {
            contract: { projectId },
            periodStart: { gte: report.periodStart },
            periodEnd: { lte: report.periodEnd },
          }
        : { contract: { projectId } };

      const acts = await db.ks2Act.findMany({
        where: ks2Where,
        include: { contract: { select: { number: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return {
        rows: acts.map((a) => ({
          number: a.number,
          periodStart: a.periodStart.toISOString(),
          periodEnd: a.periodEnd.toISOString(),
          totalAmount: a.totalAmount,
          contractNumber: a.contract.number,
          status: a.status,
        })),
        totalAmount: acts.reduce((sum, a) => sum + a.totalAmount, 0),
        total: acts.length,
      };
    }

    case ReportBlockType.ID_STATUS: {
      // Агрегация исполнительной документации по статусам
      const docs = await db.executionDoc.findMany({
        where: { contract: { projectId } },
        select: { status: true, type: true },
      });
      const byStatus: Record<string, number> = {};
      for (const doc of docs) {
        byStatus[doc.status] = (byStatus[doc.status] ?? 0) + 1;
      }
      const signed = byStatus['SIGNED'] ?? 0;
      const readiness = docs.length > 0 ? Math.round((signed / docs.length) * 100) : 0;
      return { total: docs.length, byStatus, readiness };
    }

    case ReportBlockType.DEFECTS_SUMMARY: {
      // Сводка дефектов: по статусам, категориям, просроченные
      const defects = await db.defect.findMany({
        where: { projectId },
        select: { status: true, category: true, deadline: true },
      });
      const now = new Date();
      const overdue = defects.filter(
        (d) =>
          d.deadline &&
          d.deadline < now &&
          !['RESOLVED', 'CONFIRMED'].includes(d.status)
      ).length;
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      for (const d of defects) {
        byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
        byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;
      }
      return { total: defects.length, byStatus, byCategory, overdue };
    }

    case ReportBlockType.GPR_PROGRESS: {
      // Ход выполнения ГПР: план vs факт, средний прогресс
      const tasks = await db.ganttTask.findMany({
        where: { version: { projectId } },
        select: {
          name: true,
          planStart: true,
          planEnd: true,
          factStart: true,
          factEnd: true,
          progress: true,
          isCritical: true,
        },
        orderBy: { sortOrder: 'asc' },
        take: 100,
      });
      const avgProgress =
        tasks.length > 0
          ? Math.round(
              tasks.reduce((s, t) => s + t.progress, 0) / tasks.length
            )
          : 0;
      return {
        tasks: tasks.map((t) => ({
          name: t.name,
          planStart: t.planStart.toISOString(),
          planEnd: t.planEnd.toISOString(),
          factStart: t.factStart?.toISOString() ?? null,
          factEnd: t.factEnd?.toISOString() ?? null,
          progress: t.progress,
          isCritical: t.isCritical,
          // Отклонение в днях: положительное — задержка, отрицательное — опережение
          deviationDays:
            t.factEnd && t.planEnd
              ? Math.ceil(
                  (t.factEnd.getTime() - t.planEnd.getTime()) / 86400000
                )
              : null,
        })),
        avgProgress,
        total: tasks.length,
      };
    }

    case ReportBlockType.PHOTO_REPORT: {
      // Фото за период: берём фото из записей о работах за выбранный период
      const workRecordIds = await db.workRecord
        .findMany({
          where: {
            contract: { projectId },
            ...(dateRangeFilter ? { date: dateRangeFilter } : {}),
          },
          select: { id: true },
          take: 200,
        })
        .then((recs) => recs.map((r) => r.id));

      const photos = await db.photo.findMany({
        where: {
          entityType: 'WORK_RECORD',
          entityId: { in: workRecordIds },
        },
        select: {
          id: true,
          s3Key: true,
          fileName: true,
          takenAt: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return {
        photos: photos.map((p) => ({
          id: p.id,
          s3Key: p.s3Key,
          fileName: p.fileName,
          takenAt: p.takenAt?.toISOString() ?? null,
          category: p.category,
        })),
        total: photos.length,
      };
    }

    case ReportBlockType.FUNDING_STATUS: {
      // Финансирование: источники и фактические платежи по договорам
      const [sources, payments] = await Promise.all([
        db.fundingSource.findMany({
          where: { projectId },
          select: { type: true, name: true, amount: true, period: true },
        }),
        db.contractPayment.findMany({
          where: { contract: { projectId } },
          select: { paymentType: true, amount: true, paymentDate: true },
          orderBy: { paymentDate: 'asc' },
          take: 200,
        }),
      ]);
      const totalFunding = sources.reduce((s, f) => s + f.amount, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      return {
        sources: sources.map((s) => ({
          type: s.type,
          name: s.name,
          amount: s.amount,
          period: s.period,
        })),
        payments: payments.map((p) => ({
          type: p.paymentType,
          amount: p.amount,
          date: p.paymentDate.toISOString(),
        })),
        totalFunding,
        totalPaid,
        // Остаток финансирования
        balance: totalFunding - totalPaid,
      };
    }

    case ReportBlockType.DAILY_LOG_SUMMARY: {
      // Сводка дневника прораба за период
      const logs = await db.dailyLog.findMany({
        where: {
          contract: { projectId },
          ...(dateRangeFilter ? { date: dateRangeFilter } : {}),
        },
        select: {
          date: true,
          weather: true,
          temperature: true,
          workersCount: true,
          notes: true,
        },
        orderBy: { date: 'asc' },
        take: 200,
      });
      return {
        rows: logs.map((l) => ({
          date: l.date.toISOString(),
          weather: l.weather ?? '',
          temperature: l.temperature ?? null,
          workersCount: l.workersCount ?? null,
          notes: l.notes ?? '',
        })),
        totalDays: logs.length,
      };
    }

    case ReportBlockType.FREE_TEXT:
    case ReportBlockType.CUSTOM_TABLE:
    default:
      // Возвращаем существующий контент без изменений — пользователь заполняет вручную
      return (block.content as Record<string, unknown>) ?? {};
  }
}
