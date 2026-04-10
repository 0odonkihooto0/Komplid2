import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * GET — поиск документов по объекту строительства (ExecutionDoc + Ks2Act).
 * Используется в диалоге привязки ТИМ-элементов к документации.
 * ?search=&type=ExecutionDoc|Ks2Act&limit=50
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
    const search = searchParams.get('search') ?? '';
    const typeFilter = searchParams.get('type'); // 'ExecutionDoc' | 'Ks2Act' | null (оба)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));

    const searchWhere = search.trim()
      ? { OR: [
          { number: { contains: search, mode: 'insensitive' as const } },
          { title:  { contains: search, mode: 'insensitive' as const } },
        ] }
      : {};

    const [execDocs, ks2Acts] = await Promise.all([
      (typeFilter === null || typeFilter === 'ExecutionDoc')
        ? db.executionDoc.findMany({
            where: { contract: { projectId: params.projectId }, ...searchWhere },
            select: { id: true, number: true, title: true, status: true, contractId: true },
            orderBy: { number: 'asc' },
            take: limit,
          })
        : Promise.resolve([]),

      (typeFilter === null || typeFilter === 'Ks2Act')
        ? db.ks2Act.findMany({
            where: {
              contract: { projectId: params.projectId },
              ...(search.trim()
                ? { number: { contains: search, mode: 'insensitive' as const } }
                : {}),
            },
            select: { id: true, number: true, status: true, contractId: true },
            orderBy: { number: 'asc' },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    const result = [
      ...execDocs.map((d) => ({
        id: d.id,
        entityType: 'ExecutionDoc' as const,
        number: d.number ?? null,
        title: d.title ?? null,
        status: d.status as string,
        contractId: d.contractId,
      })),
      ...ks2Acts.map((k) => ({
        id: k.id,
        entityType: 'Ks2Act' as const,
        number: String(k.number ?? ''),
        title: null as string | null,
        status: k.status as string,
        contractId: k.contractId,
      })),
    ];

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка поиска документов по объекту');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
