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
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type PrismaModelClient = {
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  delete: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function getModelClient(modelName: string): PrismaModelClient {
  return (db as unknown as Record<string, PrismaModelClient>)[modelName];
}

function scopedWhere(
  id: string,
  orgId: string,
  scope: 'system' | 'organization'
): Record<string, unknown> {
  return scope === 'organization' ? { id, organizationId: orgId } : { id };
}

function buildPatchShape(fields: ReferenceFieldSchema[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.readonly) continue;
    let s: z.ZodTypeAny;
    switch (f.type) {
      case 'number':
        s = z.coerce.number();
        break;
      case 'boolean':
        s = z.boolean();
        break;
      case 'date':
        s = z.string();
        break;
      default:
        s = z.string();
    }
    shape[f.key] = s.optional().nullable() as z.ZodTypeAny;
  }
  return shape;
}

type Params = { params: { slug: string; id: string } };

/** GET /api/references/[slug]/[id] — получить одну запись */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    const modelClient = getModelClient(schema.model);
    const entry = await modelClient.findFirst({
      where: scopedWhere(params.id, session.user.organizationId, schema.scope),
    });
    if (!entry) return errorResponse('Запись не найдена', 404);
    return successResponse(entry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записи справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH /api/references/[slug]/[id] — обновить запись */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    if (schema.adminOnly || schema.scope === 'system') {
      requireSystemAdmin(session);
    }

    const modelClient = getModelClient(schema.model);
    const existing = await modelClient.findFirst({
      where: scopedWhere(params.id, session.user.organizationId, schema.scope),
    });
    if (!existing) return errorResponse('Запись не найдена', 404);

    const body = await req.json();
    const zodSchema = z.object(buildPatchShape(schema.fields));
    const parsed = zodSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );

    const updated = await modelClient.update({ where: { id: params.id }, data: updateData });

    if (schema.auditable !== false) {
      await writeAudit({
        entityType: params.slug,
        entityId: params.id,
        action: ReferenceAuditAction.UPDATE,
        oldValues: existing as Record<string, unknown>,
        newValues: updated as Record<string, unknown>,
        userId: session.user.id,
        organizationId: schema.scope === 'organization' ? session.user.organizationId : null,
      });
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления записи справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE /api/references/[slug]/[id] — удалить запись */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    if (schema.adminOnly || schema.scope === 'system') {
      requireSystemAdmin(session);
    }

    const modelClient = getModelClient(schema.model);
    const existing = await modelClient.findFirst({
      where: scopedWhere(params.id, session.user.organizationId, schema.scope),
    });
    if (!existing) return errorResponse('Запись не найдена', 404);

    await modelClient.delete({ where: { id: params.id } });

    if (schema.auditable !== false) {
      await writeAudit({
        entityType: params.slug,
        entityId: params.id,
        action: ReferenceAuditAction.DELETE,
        oldValues: existing as Record<string, unknown>,
        userId: session.user.id,
        organizationId: schema.scope === 'organization' ? session.user.organizationId : null,
      });
    }

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
