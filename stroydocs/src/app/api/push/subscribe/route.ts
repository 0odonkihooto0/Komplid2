import { z } from 'zod';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { db } from '@/lib/db';

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation error', 400);

    const sub = await db.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: session.user.id,
        endpoint: parsed.data.endpoint,
        p256dhKey: parsed.data.keys.p256dh,
        authKey: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent,
      },
      update: {
        userId: session.user.id,
        p256dhKey: parsed.data.keys.p256dh,
        authKey: parsed.data.keys.auth,
        lastUsedAt: new Date(),
      },
    });

    return successResponse({ id: sub.id });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse('Internal error', 500);
  }
}
