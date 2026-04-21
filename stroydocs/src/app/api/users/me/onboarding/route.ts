import { z } from 'zod';
import { ProfessionalRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  professionalRole: z.nativeEnum(ProfessionalRole),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Неверная роль', 400, parsed.error.issues);
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { professionalRole: parsed.data.professionalRole },
  });

  return successResponse({ professionalRole: parsed.data.professionalRole });
}
