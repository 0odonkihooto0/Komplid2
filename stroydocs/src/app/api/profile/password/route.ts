import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .max(72, 'Пароль не может быть длиннее 72 символов');

const schema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: passwordSchema,
});

/** POST /api/profile/password — смена пароля */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });
    if (!user) return errorResponse('Пользователь не найден', 404);

    const isValid = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) return errorResponse('Неверный текущий пароль', 400);

    const newHash = await hash(parsed.data.newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка смены пароля', 500);
  }
}
