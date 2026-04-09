import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Схема частичного обновления позиции номенклатуры */
const patchNomenclatureSchema = z.object({
  name: z.string().min(1, 'Наименование не может быть пустым').optional(),
  unit: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  vendorCode: z.string().optional().nullable(),
});

/**
 * Вспомогательная функция: проверяет что позиция номенклатуры принадлежит организации.
 * Возвращает null если не найдена или не совпадает organizationId.
 */
async function findNomenclatureForOrg(orgId: string, nid: string) {
  return db.materialNomenclature.findFirst({
    where: { id: nid, organizationId: orgId },
  });
}

/**
 * PATCH /api/organizations/[orgId]/nomenclature/[nid]
 * Обновление позиции номенклатуры.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; nid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности к организации (multi-tenancy)
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    // Проверяем что номенклатура принадлежит этой организации
    const existing = await findNomenclatureForOrg(params.orgId, params.nid);
    if (!existing) {
      return errorResponse('Позиция номенклатуры не найдена', 404);
    }

    const body: unknown = await req.json();
    const parsed = patchNomenclatureSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Исключаем undefined-значения чтобы не перезаписывать незатронутые поля
    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    );

    const updated = await db.materialNomenclature.update({
      where: { id: params.nid },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления номенклатуры');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/organizations/[orgId]/nomenclature/[nid]
 * Удаление позиции номенклатуры.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string; nid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности к организации (multi-tenancy)
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    // Проверяем что номенклатура принадлежит этой организации
    const existing = await findNomenclatureForOrg(params.orgId, params.nid);
    if (!existing) {
      return errorResponse('Позиция номенклатуры не найдена', 404);
    }

    await db.materialNomenclature.delete({
      where: { id: params.nid },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления номенклатуры');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
