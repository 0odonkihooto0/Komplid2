import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { DocumentCategory, RegistryDocument } from '@/components/objects/management/documents-registry.types';

export const dynamic = 'force-dynamic';

// Re-export types for consumers
export type { DocumentCategory, RegistryDocument };

const EXEC_DOC_TYPE_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'АТГ',
};

const EXEC_DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На проверке',
  SIGNED: 'Подписано',
  REJECTED: 'Отклонено',
};

const KS_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  APPROVED: 'Утверждён',
  REJECTED: 'Отклонён',
};

const PRESCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  CLOSED: 'Закрыто',
};

const REMEDIATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_REVIEW: 'На рассмотрении',
  ACCEPTED: 'Принят',
  REJECTED: 'Отклонён',
};

const SED_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  IN_APPROVAL: 'На согласовании',
  REQUIRES_ACTION: 'Требует действия',
  APPROVED: 'Согласован',
  REJECTED: 'Отклонён',
  ARCHIVED: 'Архив',
};

const DESIGN_DOC_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан',
  IN_PROGRESS: 'В работе',
  SENT_FOR_REVIEW: 'На проверке',
  WITH_COMMENTS: 'С замечаниями',
  REVIEW_PASSED: 'Проверка пройдена',
  IN_APPROVAL: 'На согласовании',
  APPROVED: 'Согласовано',
  CANCELLED: 'Аннулирован',
};

/**
 * GET /api/projects/[projectId]/all-documents
 * Агрегирует документы из всех модулей в единый реестр.
 * ?category=all|id|ks|sk|pir|other&page=1&limit=50
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') ?? 'all') as DocumentCategory;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    // Для агрегации из нескольких источников: забираем не более 200 записей из каждого,
    // пагинация выполняется в памяти по итоговому отсортированному массиву.
    const perSource = 200;

    const want = (cat: Exclude<DocumentCategory, 'all'>) =>
      category === 'all' || category === cat;

    // Параллельные запросы только для нужных категорий
    const [
      execDocs,
      ks2Acts,
      ks3Certs,
      inspectionActs,
      prescriptions,
      remediationActs,
      designDocs,
      sedDocs,
      projectDocs,
    ] = await Promise.all([
      // ИД
      want('id')
        ? db.executionDoc.findMany({
            where: { contract: { projectId: params.projectId } },
            select: {
              id: true,
              type: true,
              number: true,
              title: true,
              status: true,
              s3Key: true,
              createdAt: true,
              _count: { select: { comments: { where: { status: 'OPEN' } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // КС-2
      want('ks')
        ? db.ks2Act.findMany({
            where: { contract: { projectId: params.projectId } },
            select: {
              id: true,
              number: true,
              status: true,
              s3Key: true,
              createdAt: true,
              periodStart: true,
            },
            orderBy: { createdAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // КС-3
      want('ks')
        ? db.ks3Certificate.findMany({
            where: { contract: { projectId: params.projectId } },
            select: {
              id: true,
              status: true,
              s3Key: true,
              createdAt: true,
              ks2Act: { select: { number: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // Акты проверки СК
      want('sk')
        ? db.inspectionAct.findMany({
            where: { inspection: { projectId: params.projectId } },
            select: {
              id: true,
              number: true,
              issuedAt: true,
              s3Key: true,
            },
            orderBy: { issuedAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // Предписания
      want('sk')
        ? db.prescription.findMany({
            where: { inspection: { projectId: params.projectId } },
            select: {
              id: true,
              number: true,
              type: true,
              status: true,
              issuedAt: true,
              s3Key: true,
            },
            orderBy: { issuedAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // Акты устранения недостатков
      want('sk')
        ? db.defectRemediationAct.findMany({
            where: { inspection: { projectId: params.projectId } },
            select: {
              id: true,
              number: true,
              status: true,
              issuedAt: true,
              s3Key: true,
            },
            orderBy: { issuedAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // ПИР — документы проектирования
      want('pir')
        ? db.designDocument.findMany({
            where: { projectId: params.projectId, isDeleted: false },
            select: {
              id: true,
              number: true,
              name: true,
              status: true,
              version: true,
              currentS3Key: true,
              createdAt: true,
              _count: {
                select: { comments: { where: { status: 'ACTIVE' } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // СЭД
      want('other')
        ? db.sEDDocument.findMany({
            where: { projectId: params.projectId },
            select: {
              id: true,
              number: true,
              title: true,
              docType: true,
              status: true,
              date: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),

      // Файловое хранилище
      want('other')
        ? db.projectDocument.findMany({
            where: { folder: { projectId: params.projectId } },
            select: {
              id: true,
              name: true,
              version: true,
              s3Key: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: perSource,
          })
        : Promise.resolve([]),
    ]);

    // Маппинг в унифицированный формат
    const result: RegistryDocument[] = [
      ...execDocs.map((d) => ({
        id: d.id,
        entityType: 'ExecutionDoc' as const,
        category: 'id' as const,
        type: EXEC_DOC_TYPE_LABELS[d.type] ?? d.type,
        number: d.number,
        date: d.createdAt.toISOString(),
        name: d.title,
        status: EXEC_DOC_STATUS_LABELS[d.status] ?? d.status,
        version: null,
        hasFile: d.s3Key !== null,
        activeComments: d._count.comments,
      })),

      ...ks2Acts.map((k) => ({
        id: k.id,
        entityType: 'Ks2Act' as const,
        category: 'ks' as const,
        type: 'КС-2',
        number: k.number,
        date: k.periodStart.toISOString(),
        name: `Акт КС-2 №${k.number}`,
        status: KS_STATUS_LABELS[k.status] ?? k.status,
        version: null,
        hasFile: k.s3Key !== null,
        activeComments: 0,
      })),

      ...ks3Certs.map((k) => ({
        id: k.id,
        entityType: 'Ks3Certificate' as const,
        category: 'ks' as const,
        type: 'КС-3',
        number: k.ks2Act.number,
        date: k.createdAt.toISOString(),
        name: `Справка КС-3 к акту №${k.ks2Act.number}`,
        status: KS_STATUS_LABELS[k.status] ?? k.status,
        version: null,
        hasFile: k.s3Key !== null,
        activeComments: 0,
      })),

      ...inspectionActs.map((a) => ({
        id: a.id,
        entityType: 'InspectionAct' as const,
        category: 'sk' as const,
        type: 'Акт проверки СК',
        number: a.number,
        date: a.issuedAt.toISOString(),
        name: `Акт проверки №${a.number}`,
        status: null,
        version: null,
        hasFile: a.s3Key !== null,
        activeComments: 0,
      })),

      ...prescriptions.map((p) => ({
        id: p.id,
        entityType: 'Prescription' as const,
        category: 'sk' as const,
        type: 'Предписание',
        number: p.number,
        date: p.issuedAt.toISOString(),
        name: `Предписание №${p.number}`,
        status: PRESCRIPTION_STATUS_LABELS[p.status] ?? p.status,
        version: null,
        hasFile: p.s3Key !== null,
        activeComments: 0,
      })),

      ...remediationActs.map((r) => ({
        id: r.id,
        entityType: 'DefectRemediationAct' as const,
        category: 'sk' as const,
        type: 'Акт устранения',
        number: r.number,
        date: r.issuedAt.toISOString(),
        name: `Акт устранения №${r.number}`,
        status: REMEDIATION_STATUS_LABELS[r.status] ?? r.status,
        version: null,
        hasFile: r.s3Key !== null,
        activeComments: 0,
      })),

      ...designDocs.map((d) => ({
        id: d.id,
        entityType: 'DesignDocument' as const,
        category: 'pir' as const,
        type: 'Документ ПИР',
        number: d.number,
        date: d.createdAt.toISOString(),
        name: d.name,
        status: DESIGN_DOC_STATUS_LABELS[d.status] ?? d.status,
        version: d.version,
        hasFile: d.currentS3Key !== null,
        activeComments: d._count.comments,
      })),

      ...sedDocs.map((s) => ({
        id: s.id,
        entityType: 'SEDDocument' as const,
        category: 'other' as const,
        type: `СЭД: ${s.docType}`,
        number: s.number,
        date: (s.date ?? s.createdAt).toISOString(),
        name: s.title,
        status: SED_STATUS_LABELS[s.status] ?? s.status,
        version: null,
        hasFile: false,
        activeComments: 0,
      })),

      ...projectDocs.map((d) => ({
        id: d.id,
        entityType: 'ProjectDocument' as const,
        category: 'other' as const,
        type: 'Файл проекта',
        number: null,
        date: d.createdAt.toISOString(),
        name: d.name,
        status: null,
        version: d.version,
        hasFile: true,
        activeComments: 0,
      })),
    ];

    // Сортируем итоговый список по дате (новые первыми)
    result.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db_ = b.date ? new Date(b.date).getTime() : 0;
      return db_ - da;
    });

    const total = result.length;
    const skip = (page - 1) * limit;
    const paginated = result.slice(skip, skip + limit);

    return successResponse(paginated, { page, pageSize: limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сводного реестра документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
