import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { DefectCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';
// GET /api/sk/defect-templates — системные + шаблоны своей организации
export async function GET(req: NextRequest) {
  const session = await getSessionOrThrow();
  const { searchParams } = req.nextUrl;

  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const skip = (page - 1) * limit;

  const where = {
    OR: [
      { isSystem: true },
      { organizationId: session.user.organizationId },
    ],
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [data, total] = await Promise.all([
    db.defectTemplate.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { title: 'asc' }],
      take: limit,
      skip,
    }),
    db.defectTemplate.count({ where }),
  ]);

  return successResponse({ data, total, page, limit });
}

const createSchema = z.object({
  title:        z.string().min(1, 'Введите название шаблона').max(200),
  description:  z.string().optional(),
  category:     z.nativeEnum(DefectCategory),
  normativeRef: z.string().optional(),
  requirements: z.string().optional(),
});

// POST /api/sk/defect-templates — создать шаблон организации
export async function POST(req: NextRequest) {
  const session = await getSessionOrThrow();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message, 400);
  }

  const template = await db.defectTemplate.create({
    data: {
      ...parsed.data,
      isSystem: false,
      organizationId: session.user.organizationId,
    },
  });

  return successResponse(template);
}
