import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
export const dynamic = 'force-dynamic';

type SearchType = 'correspondence' | 'rfi' | 'sed';

interface SearchResult {
  type: SearchType;
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
}

// Обрезаем до 150 символов для превью
function makeExcerpt(text: string | null | undefined): string {
  if (!text) return '';
  return text.length > 150 ? text.slice(0, 150) + '…' : text;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return errorResponse('Запрос должен содержать минимум 2 символа', 400);

    const typesParam = searchParams.get('types');
    const requestedTypes: SearchType[] = typesParam
      ? (typesParam.split(',').filter((t: string) =>
          ['correspondence', 'rfi', 'sed'].includes(t)
        ) as SearchType[])
      : ['correspondence', 'rfi', 'sed'];

    const results: SearchResult[] = [];

    // Поиск по переписке
    if (requestedTypes.includes('correspondence')) {
      const rows = await db.$queryRaw<
        { id: string; subject: string; body: string | null; createdAt: Date }[]
      >`
        SELECT id, subject, body, "createdAt"
        FROM correspondences
        WHERE "projectId" = ${params.objectId}
          AND search_vector @@ plainto_tsquery('russian', ${q})
        ORDER BY "createdAt" DESC
        LIMIT 5
      `;
      for (const row of rows) {
        results.push({
          type: 'correspondence',
          id: row.id,
          title: row.subject,
          excerpt: makeExcerpt(row.body),
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    // Поиск по RFI
    if (requestedTypes.includes('rfi')) {
      const rows = await db.$queryRaw<
        { id: string; title: string; description: string; createdAt: Date }[]
      >`
        SELECT id, title, description, "createdAt"
        FROM rfis
        WHERE "projectId" = ${params.objectId}
          AND search_vector @@ plainto_tsquery('russian', ${q})
        ORDER BY "createdAt" DESC
        LIMIT 5
      `;
      for (const row of rows) {
        results.push({
          type: 'rfi',
          id: row.id,
          title: row.title,
          excerpt: makeExcerpt(row.description),
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    // Поиск по СЭД
    if (requestedTypes.includes('sed')) {
      const rows = await db.$queryRaw<
        { id: string; title: string; body: string | null; createdAt: Date }[]
      >`
        SELECT id, title, body, "createdAt"
        FROM sed_documents
        WHERE "projectId" = ${params.objectId}
          AND search_vector @@ plainto_tsquery('russian', ${q})
        ORDER BY "createdAt" DESC
        LIMIT 5
      `;
      for (const row of rows) {
        results.push({
          type: 'sed',
          id: row.id,
          title: row.title,
          excerpt: makeExcerpt(row.body),
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    // Сортировка по дате убывания
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return successResponse(results);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка глобального поиска');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
