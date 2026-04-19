import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getReferenceSchema } from '@/lib/references/registry';
import { writeAudit } from '@/lib/references/audit';
import type { ReferenceFieldSchema } from '@/lib/references/types';
import { ReferenceAuditAction } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Динамический доступ к Prisma без any
type PrismaModelClient = {
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function getModelClient(modelName: string): PrismaModelClient {
  return (db as unknown as Record<string, PrismaModelClient>)[modelName];
}

function buildWhere(
  fields: ReferenceFieldSchema[],
  orgId: string,
  scope: 'system' | 'organization',
  search?: string | null
): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [];

  if (scope === 'organization') {
    // Системные записи (isSystem=true, organizationId=null) видны всем организациям
    conditions.push({ OR: [{ organizationId: orgId }, { organizationId: null, isSystem: true }] });
  }

  if (search) {
    const textFields = fields
      .filter((f) => f.type === 'string' || f.type === 'textarea')
      .map((f) => ({ [f.key]: { contains: search, mode: 'insensitive' } }));
    if (textFields.length > 0) conditions.push({ OR: textFields });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function buildZodShape(fields: ReferenceFieldSchema[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.readonly) continue;
    let s: z.ZodTypeAny;
    switch (f.type) {
      case 'number':
        s = z.coerce.number();
        break;
      case 'boolean':
        s = z.boolean().default(false);
        break;
      case 'date':
        s = z.string();
        break;
      default:
        s = z.string();
    }
    if (!f.required) s = s.optional().nullable() as z.ZodTypeAny;
    shape[f.key] = s;
  }
  return shape;
}

/** GET /api/references/[slug] — список с пагинацией, поиском, сортировкой */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    const sp = req.nextUrl.searchParams;
    const countOnly = sp.get('count') === 'true';
    const search = sp.get('search')?.trim().slice(0, 200) || null;
    const sort = sp.get('sort') || 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(sp.get('page') || 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') || 50)));
    const skip = (page - 1) * limit;

    const validSortKeys = schema.fields.map((f) => f.key).concat(['createdAt', 'updatedAt', 'id']);
    const safeSort = validSortKeys.includes(sort) ? sort : 'createdAt';

    const where = buildWhere(schema.fields, session.user.organizationId, schema.scope, search);
    const modelClient = getModelClient(schema.model);

    if (countOnly) {
      const count = await modelClient.count({ where });
      return successResponse({ count });
    }

    const [rows, total] = await Promise.all([
      modelClient.findMany({ where, orderBy: { [safeSort]: order }, skip, take: limit }),
      modelClient.count({ where }),
    ]);

    return successResponse(rows, {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST /api/references/[slug] — создать запись */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    if (schema.adminOnly || schema.scope === 'system') {
      if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);
    }

    const body = await req.json();
    const zodSchema = z.object(buildZodShape(schema.fields));
    const parsed = zodSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const data: Record<string, unknown> = { ...parsed.data };
    if (schema.scope === 'organization') data.organizationId = session.user.organizationId;

    const modelClient = getModelClient(schema.model);
    const entry = await modelClient.create({ data });

    if (schema.auditable !== false) {
      await writeAudit({
        entityType: params.slug,
        entityId: entry.id as string,
        action: ReferenceAuditAction.CREATE,
        newValues: entry as Record<string, unknown>,
        userId: session.user.id,
        organizationId: schema.scope === 'organization' ? session.user.organizationId : null,
      });
    }

    return successResponse(entry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
