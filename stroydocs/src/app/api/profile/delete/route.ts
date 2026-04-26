import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  password: z.string().min(1, 'Введите пароль для подтверждения'),
});

/** POST /api/profile/delete — удаление аккаунта */
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

    const isValid = await compare(parsed.data.password, user.passwordHash);
    if (!isValid) return errorResponse('Неверный пароль', 400);

    // Блокируем удаление если пользователь — единственный OWNER хотя бы одного workspace
    const soleOwnerWorkspace = await db.workspace.findFirst({
      where: {
        ownerId: session.user.id,
        members: {
          none: {
            role: 'OWNER',
            userId: { not: session.user.id },
            status: 'ACTIVE',
          },
        },
      },
      select: { id: true, name: true },
    });

    if (soleOwnerWorkspace) {
      return errorResponse(
        `Вы единственный владелец рабочего пространства "${soleOwnerWorkspace.name}". ` +
          'Передайте права владельца другому члену команды перед удалением аккаунта.',
        409
      );
    }

    // Анонимизируем данные пользователя вместо физического удаления
    await db.user.update({
      where: { id: user.id },
      data: {
        email: `deleted_${user.id}@deleted.local`,
        passwordHash: '',
        firstName: 'Удалённый',
        lastName: 'Пользователь',
        middleName: null,
        phone: null,
        position: null,
        isActive: false,
      },
    });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка удаления аккаунта', 500);
  }
}
