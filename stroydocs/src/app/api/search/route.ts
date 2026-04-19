import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/*
 * Глобальный поиск по объектам, документам, задачам и договорам организации.
 *
 * TODO: rate-limit this route — no rate-limit infrastructure exists in the
 * project yet (grep ratelimit|upstash in src/lib/ → empty, no middleware.ts).
 * Current mitigations: (a) client debounce 200ms in CommandPalette.tsx,
 * (b) short-circuit queries shorter than 2 chars both client- and server-side.
 * If Upstash or a custom middleware is added later, apply it here.
 */

const MIN_QUERY_LENGTH = 2;
const LIMIT_PER_GROUP = 5;

export interface SearchResults {
  objects: Array<{ id: string; name: string; shortName: string | null; address: string | null }>;
  contracts: Array<{ id: string; number: string; name: string; projectId: string }>;
  docs: Array<{ id: string; number: string; title: string; contractId: string }>;
  tasks: Array<{ id: string; title: string; projectId: string }>;
}

const EMPTY_RESULTS: SearchResults = { objects: [], contracts: [], docs: [], tasks: [] };

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const organizationId = session.user.organizationId;

    const rawQuery = req.nextUrl.searchParams.get('q') ?? '';
    const q = rawQuery.trim();

    // Сервер также отбрасывает короткие запросы — клиент может быть обойдён curl-ом
    if (q.length < MIN_QUERY_LENGTH) {
      return successResponse(EMPTY_RESULTS);
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const [objects, contracts, docs, tasks] = await Promise.all([
      db.buildingObject.findMany({
        where: {
          organizationId,
          OR: [{ name: contains }, { shortName: contains }, { address: contains }],
        },
        select: { id: true, name: true, shortName: true, address: true },
        take: LIMIT_PER_GROUP,
        orderBy: { updatedAt: 'desc' },
      }),
      db.contract.findMany({
        where: {
          // Contract связан с объектом через relation `buildingObject`
          // (поле `projectId`, но имя relation — `buildingObject`).
          buildingObject: { organizationId },
          OR: [{ number: contains }, { name: contains }],
        },
        select: { id: true, number: true, name: true, projectId: true },
        take: LIMIT_PER_GROUP,
        orderBy: { updatedAt: 'desc' },
      }),
      db.executionDoc.findMany({
        where: {
          contract: { buildingObject: { organizationId } },
          OR: [{ number: contains }, { title: contains }],
        },
        select: { id: true, number: true, title: true, contractId: true },
        take: LIMIT_PER_GROUP,
        orderBy: { updatedAt: 'desc' },
      }),
      db.task.findMany({
        where: {
          project: { organizationId },
          title: contains,
        },
        select: { id: true, title: true, projectId: true },
        take: LIMIT_PER_GROUP,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return successResponse<SearchResults>({ objects, contracts, docs, tasks });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка глобального поиска');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
