import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { uploadFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';
import { generateInfoReportPdf, type InfoReportPdfData } from '@/lib/info-report-pdf-generator';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/** Форматирование числа в рубли: 1 234 567,00 */
function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Форматирование даты: ДД.ММ.ГГГГ */
function formatDate(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleDateString('ru-RU');
}

/** Форматирование даты формирования: "10 апреля 2026 г." */
function formatFormationDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Вычислить отклонение от плановой даты окончания */
function computeDeviationText(plannedEndDate: Date | null | undefined): string {
  if (!plannedEndDate) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(plannedEndDate);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'В срок';
  if (diffDays > 0) return `Опережение ${diffDays} дн.`;
  return `Отставание ${Math.abs(diffDays)} дн.`;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // 1. Загружаем объект с проверкой принадлежности к организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      include: {
        // Записи финансирования — берём последний год по типу ALLOCATED
        fundingRecords: {
          where: { recordType: 'ALLOCATED' },
          orderBy: { year: 'desc' },
          take: 1,
        },
        // Основной договор СМР
        contracts: {
          where: { type: 'MAIN' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          include: {
            participants: {
              include: { organization: { select: { name: true } } },
            },
            ks2Acts: {
              where: { status: 'APPROVED' },
              select: { totalAmount: true },
            },
          },
        },
        // Акты закрытия ПИР
        pirClosureActs: {
          where: { status: 'SIGNED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        // Документы ПИР для расчёта готовности
        designDocs: {
          select: { status: true, expertiseStatus: true },
        },
        // Активные проблемные вопросы
        problemIssues: {
          where: { status: 'ACTIVE' },
          select: { description: true, type: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!object) return errorResponse('Объект не найден', 404);

    // 2. Подрядчик ПИР — отдельный запрос (contractorOrgId в PIRClosureAct не является @relation)
    const pirAct = object.pirClosureActs[0] ?? null;
    let pirContractorName = '—';
    if (pirAct?.contractorOrgId) {
      const org = await db.organization.findUnique({
        where: { id: pirAct.contractorOrgId },
        select: { name: true },
      });
      pirContractorName = org?.name ?? '—';
    }

    // 3. Финансирование
    const fundingRec = object.fundingRecords[0] ?? null;
    const budgetSum = fundingRec
      ? fundingRec.federalBudget + fundingRec.regionalBudget + fundingRec.localBudget + fundingRec.ownFunds
      : null;

    // 4. Данные СМР из основного договора
    const mainContract = object.contracts[0] ?? null;
    const smrContractor =
      mainContract?.participants.find((p) => p.role === 'CONTRACTOR')?.organization?.name ?? '—';
    const masteredSmr = mainContract?.ks2Acts.reduce((sum, a) => sum + a.totalAmount, 0) ?? 0;
    let smrReadinessNum: number | null = null;
    if (mainContract?.totalAmount && mainContract.totalAmount > 0) {
      smrReadinessNum = Math.min(100, Math.round((masteredSmr / mainContract.totalAmount) * 100));
    }

    // 5. Готовность ПИР: одобренные документы / всего документов
    const totalDocs = object.designDocs.length;
    const approvedDocs = object.designDocs.filter((d) => d.status === 'APPROVED').length;
    let pirReadinessNum: number | null = null;
    if (totalDocs > 0) {
      pirReadinessNum = Math.min(100, Math.round((approvedDocs / totalDocs) * 100));
    }

    // 6. Стадии реализации
    const stages = {
      // ИРД — есть разрешение на строительство
      ird: !!object.permitNumber,
      // ПИР — есть хотя бы один документ ПИР
      pir: object.designDocs.length > 0,
      // Экспертиза — есть положительное заключение хотя бы по одному документу
      expertise: object.designDocs.some((d) => d.expertiseStatus === 'APPROVED_POSITIVE'),
      // СМР — подписан хотя бы один акт КС-2
      smr: (mainContract?.ks2Acts.length ?? 0) > 0,
      // Ввод в эксплуатацию — объект завершён или есть фактическая дата окончания
      commissioning: object.status === 'COMPLETED' || !!object.actualEndDate,
    };

    // 7. Проблемные вопросы
    let problemsText = 'Проблемные вопросы отсутствуют';
    if (object.problemIssues.length > 0) {
      problemsText = object.problemIssues.map((p, i) => `${i + 1}. ${p.description}`).join('\n');
    }

    // 8. Сборка данных для шаблона
    const reportData: InfoReportPdfData = {
      formationDate: formatFormationDate(new Date()),
      programPoint: '',
      orderNumber: '',

      objectName: object.name,
      shortName: object.shortName ?? '',

      customer: object.customer ?? '—',
      responsibleExecutor: object.generalContractor ?? '—',

      fundingYear: fundingRec ? String(fundingRec.year) : '—',
      budgetAllocated: formatMoney(budgetSum),
      extraBudget: formatMoney(fundingRec?.extraBudget),

      plannedStartDate: formatDate(object.plannedStartDate),
      plannedEndDate: formatDate(object.plannedEndDate),
      deviationText: computeDeviationText(object.plannedEndDate),

      stages,

      pirContractor: pirContractorName,
      pirTotalAmount: formatMoney(pirAct?.totalAmount),
      pirEndDate: formatDate(pirAct?.periodEnd),
      pirReadiness: pirReadinessNum !== null ? `${pirReadinessNum}%` : '—',
      pirReadinessNum,
      pirDynamics: '—',

      smrContractor,
      smrTotalAmount: formatMoney(mainContract?.totalAmount),
      smrEndDate: formatDate(mainContract?.endDate),
      smrReadiness: smrReadinessNum !== null ? `${smrReadinessNum}%` : '—',
      smrReadinessNum,
      smrDynamics: '—',

      problems: problemsText,
      workersCount: '—',
      workersDynamics: '—',
      equipmentCount: '—',
      equipmentDynamics: '—',
    };

    // 9. Генерация PDF
    const pdfBuffer = await generateInfoReportPdf(reportData);

    // 10. Загрузка в S3 (без сохранения ключа в БД — отчёт генерируется одноразово)
    const safeName = object.name.slice(0, 30).replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_');
    const fileName = `info-report-${safeName}.pdf`;
    const s3Key = buildS3Key(session.user.organizationId, 'info-reports', fileName);
    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    // 11. Pre-signed URL для скачивания (TTL: 1 час)
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ downloadUrl, fileName });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF информационного отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
