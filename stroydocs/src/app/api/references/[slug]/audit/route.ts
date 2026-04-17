import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getReferenceSchema } from '@/lib/references/registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/references/[slug]/audit?entityId=&limit=20&cursor=
 *
 * Возвращает историю изменений справочника с cursor-based пагинацией.
 * cursor — id последней загруженной записи (createdAt DESC).
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    const sp = req.nextUrl.searchParams;
    const entityId = sp.get('entityId')?.trim() || undefined;
    const cursor = sp.get('cursor')?.trim() || undefined;
    const limit = Math.min(50, Math.max(1, Number(sp.get('limit') || 20)));
    const from = sp.get('from')?.trim() || undefined;
    const to = sp.get('to')?.trim() || undefined;

    const where: Record<string, unknown> = {
      entityType: params.slug,
    };

    if (entityId) where.entityId = entityId;

    // Фильтр по организации для organization-scope справочников
    if (schema.scope === 'organization') {
      where.organizationId = session.user.organizationId;
    }

    // Cursor pagination: берём записи с createdAt < createdAt записи-курсора
    if (cursor) {
      const cursorRecord = await db.referenceAudit.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorRecord) {
        where.createdAt = { lt: cursorRecord.createdAt };
      }
    }

    // Фильтр по диапазону дат
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.createdAt = { ...(where.createdAt as Record<string, unknown> ?? {}), ...dateFilter };
    }

    const items = await db.referenceAudit.findMany({
      where: where as Parameters<typeof db.referenceAudit.findMany>[0]['where'],
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return successResponse({ items: data, nextCursor });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения аудита справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
