import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { convertImportToVersion } from '@/lib/estimates/convert-import-to-version';

export const dynamic = 'force-dynamic';

/** GET — список версий смет по договору (опциональный фильтр по categoryId) */
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const categoryId = req.nextUrl.searchParams.get('categoryId');

    const versions = await db.estimateVersion.findMany({
      where: {
        contractId: params.contractId,
        ...(categoryId && { categoryId }),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        category: { select: { id: true, name: true } },
        contract: {
          select: {
            id: true,
            name: true,
            number: true,
            participants: {
              select: {
                role: true,
                organization: { select: { name: true } },
              },
            },
          },
        },
        _count: { select: { chapters: true, childVersions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(versions);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createVersionSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  versionType: z.enum(['BASELINE', 'ACTUAL', 'CORRECTIVE']).default('ACTUAL'),
  period: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  sourceImportId: z.string().uuid().optional(),
  parentVersionId: z.string().uuid().optional(),
});

/** POST — создать версию сметы (пустую или из подтверждённого импорта) */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем что договор принадлежит проекту
    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.objectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    // Если передан sourceImportId — создаём версию из импорта
    if (data.sourceImportId) {
      const importRecord = await db.estimateImport.findFirst({
        where: { id: data.sourceImportId, contractId: params.contractId },
      });
      if (!importRecord) return errorResponse('Импорт не найден', 404);
      if (importRecord.status !== 'CONFIRMED') {
        return errorResponse('Импорт не подтверждён', 400);
      }

      const version = await convertImportToVersion(
        data.sourceImportId,
        params.contractId,
        session.user.id,
        data.name
      );
      return successResponse(version);
    }

    // Создаём пустую версию
    const version = await db.estimateVersion.create({
      data: {
        name: data.name,
        versionType: data.versionType,
        isBaseline: data.versionType === 'BASELINE',
        isActual: data.versionType === 'ACTUAL',
        period: data.period ?? null,
        notes: data.notes ?? null,
        contractId: params.contractId,
        createdById: session.user.id,
        parentVersionId: data.parentVersionId ?? null,
      },
    });

    return successResponse(version);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
