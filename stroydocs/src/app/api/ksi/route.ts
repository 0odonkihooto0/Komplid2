import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { findKsiByCodeOrTitle } from '@/lib/ksi/external-api';

export const dynamic = 'force-dynamic';

/** Получить дерево КСИ (корневые узлы или дочерние) с фильтрацией по таблице */
export async function GET(req: NextRequest) {
  try {
    await getSessionOrThrow();

    const sp = req.nextUrl.searchParams;
    const parentId = sp.get('parentId');
    const search = (sp.get('search') || '').trim().slice(0, 100) || null;
    // Фильтр по классификационной таблице (например «ОКС / CEn»)
    const tableCode = (sp.get('tableCode') || '').trim() || null;
    // При search=1 и нет локальных результатов — fallback на внешний API
    const noFallback = sp.get('noFallback') === '1';

    // ── Режим поиска ────────────────────────────────────────────────────────
    if (search) {
      const localNodes = await db.ksiNode.findMany({
        where: {
          AND: [
            tableCode ? { tableCode: { contains: tableCode, mode: 'insensitive' } } : {},
            {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: { parent: { select: { code: true, name: true } } },
        take: 50,
        orderBy: { code: 'asc' },
      });

      // Если локальная БД не дала результатов — спрашиваем внешний API
      if (localNodes.length === 0 && !noFallback) {
        try {
          const externalNodes = await findKsiByCodeOrTitle(search, 30);
          // Приводим ответ к общей форме (поле name вместо title)
          const mapped = externalNodes.map((n) => ({
            id: n.id,
            code: n.code,
            name: n.title,
            description: n.description,
            tableCode: n.tableCode,
            externalId: n.id,
            parentId: n.parentId,
            level: 0,
            _source: 'external' as const,
          }));
          return successResponse(mapped);
        } catch (extErr) {
          // Внешний API недоступен — возвращаем пустой результат
          logger.warn({ err: extErr }, 'Внешний API КСИ недоступен при поиске');
        }
      }

      return successResponse(localNodes);
    }

    // ── Режим дерева ────────────────────────────────────────────────────────

    // Для дочерних узлов — НЕ фильтруем по tableCode, показываем всех детей
    if (parentId) {
      const children = await db.ksiNode.findMany({
        where: { parentId },
        include: { _count: { select: { children: true } } },
        orderBy: { code: 'asc' },
      });
      return successResponse(children);
    }

    // Для корневых узлов — сначала пробуем с фильтром tableCode
    let nodes = await db.ksiNode.findMany({
      where: {
        parentId: null,
        ...(tableCode ? { tableCode: { contains: tableCode, mode: 'insensitive' } } : {}),
      },
      include: { _count: { select: { children: true } } },
      orderBy: { code: 'asc' },
    });

    // Fallback: если корневые узлы не имеют tableCode — ищем через потомков
    if (tableCode && nodes.length === 0) {
      const matching = await db.ksiNode.findMany({
        where: { tableCode: { contains: tableCode, mode: 'insensitive' } },
        select: { code: true },
        take: 200,
      });
      if (matching.length > 0) {
        // Извлекаем код корневого узла (сегмент до первой точки)
        const rootCodes = Array.from(new Set(matching.map((n) => n.code.split('.')[0])));
        nodes = await db.ksiNode.findMany({
          where: { parentId: null, code: { in: rootCodes } },
          include: { _count: { select: { children: true } } },
          orderBy: { code: 'asc' },
        });
      }
    }

    return successResponse(nodes);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения КСИ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
