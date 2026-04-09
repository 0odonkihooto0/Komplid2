import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  middleName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
});

/** GET /api/profile — профиль текущего пользователя */
export async function GET() {
  try {
    const session = await getSessionOrThrow();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        phone: true,
        position: true,
        role: true,
        organization: { select: { id: true, name: true, address: true } },
      },
    });

    if (!user) return errorResponse('Пользователь не найден', 404);
    return successResponse(user);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка получения профиля', 500);
  }
}

/** PATCH /api/profile — обновление профиля */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const user = await db.user.update({
      where: { id: session.user.id },
      data: parsed.data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        phone: true,
        position: true,
        role: true,
      },
    });

    return successResponse(user);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка обновления профиля', 500);
  }
}
