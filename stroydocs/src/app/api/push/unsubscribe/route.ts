import { z } from 'zod';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


const schema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation error', 400);

    // Удаляем только подписку текущего пользователя — защита от межтенантной утечки
    await db.pushSubscription.deleteMany({
      where: {
        endpoint: parsed.data.endpoint,
        userId: session.user.id,
      },
    });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse('Internal error', 500);
  }
}
