import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requireSystemAdmin } from '@/lib/permissions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_]+$/, 'Ключ должен содержать только строчные буквы, цифры и _'),
  description: z.string().max(512).optional(),
  enabled: z.boolean().default(false),
  rolloutPercent: z.number().int().min(0).max(100).default(0),
  audiences: z
    .object({
      workspaceIds: z.array(z.string()).optional(),
      userIds: z.array(z.string()).optional(),
      intents: z.array(z.string()).optional(),
    })
    .optional(),
});

// GET /api/admin/feature-flags — список всех флагов (пагинация)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const { searchParams } = new URL(req.url);
    const skip = Math.max(0, Number(searchParams.get('skip') ?? 0));
    const take = Math.min(200, Math.max(1, Number(searchParams.get('take') ?? 50)));
    const search = searchParams.get('search') ?? '';

    const where = search
      ? {
          OR: [
            { key: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await db.$transaction([
      db.featureFlag.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      db.featureFlag.count({ where }),
    ]);

    return successResponse(items, {
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}

// POST /api/admin/feature-flags — создать новый флаг
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { key, description, enabled, rolloutPercent, audiences } = parsed.data;

    const existing = await db.featureFlag.findUnique({ where: { key } });
    if (existing) {
      return errorResponse(`Флаг с ключом "${key}" уже существует`, 409);
    }

    const flag = await db.featureFlag.create({
      data: {
        key,
        description,
        enabled,
        rolloutPercent,
        audiences: audiences ?? undefined,
      },
    });

    return successResponse(flag);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
