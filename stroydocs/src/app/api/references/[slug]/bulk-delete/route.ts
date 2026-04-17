import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getReferenceSchema } from '@/lib/references/registry';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type PrismaModelClient = {
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  deleteMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
};

function getModelClient(modelName: string): PrismaModelClient {
  return (db as unknown as Record<string, PrismaModelClient>)[modelName];
}

const bodySchema = z.object({
  ids: z.array(z.string()).min(1, 'Не указаны ID').max(100, 'Максимум 100 записей за раз'),
});

/** POST /api/references/[slug]/bulk-delete — массовое удаление */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    if (schema.adminOnly || schema.scope === 'system') {
      if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { ids } = parsed.data;
    const modelClient = getModelClient(schema.model);

    const where: Record<string, unknown> = { id: { in: ids } };
    if (schema.scope === 'organization') where.organizationId = session.user.organizationId;

    const existing = await modelClient.findMany({ where, select: { id: true } } as Record<string, unknown>);
    const validIds = existing.map((r) => r.id as string);

    if (validIds.length === 0) return errorResponse('Записи не найдены', 404);

    if (schema.auditable !== false) {
      const fullRecords = await modelClient.findMany({
        where: { id: { in: validIds } },
      });
      await db.$transaction(
        fullRecords.map((rec) =>
          db.referenceAudit.create({
            data: {
              slug: params.slug,
              entryId: rec.id as string,
              action: 'DELETE',
              oldData: rec as unknown as Prisma.InputJsonValue,
              userId: session.user.id,
              organizationId: schema.scope === 'organization' ? session.user.organizationId : null,
            },
          })
        )
      );
    }

    await modelClient.deleteMany({ where: { id: { in: validIds } } });

    return successResponse({ deleted: validIds.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка массового удаления справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
