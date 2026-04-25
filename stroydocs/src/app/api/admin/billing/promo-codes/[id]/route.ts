import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const promo = await db.promoCode.findUnique({ where: { id: params.id } });
    if (!promo) return errorResponse('Промокод не найден', 404);

    // Деактивируем промокод, выставив дату истечения в прошлое
    await db.promoCode.update({
      where: { id: params.id },
      data: { validUntil: new Date() },
    });

    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
