import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { Prisma, PaymentStatus, PaymentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  period: z.enum(['30d', '3m', '1y', 'all']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();
    const sp = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = querySchema.safeParse(sp);
    if (!parsed.success) return errorResponse('Неверные параметры', 400);

    const { status, type, period, page, limit } = parsed.data;

    const where: Prisma.PaymentWhereInput = {
      workspaceId,
      ...(status && { status: status as PaymentStatus }),
      ...(type && { type: type as PaymentType }),
    };

    if (period && period !== 'all') {
      const now = new Date();
      const periodMap: Record<string, Date> = {
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        '3m': new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
        '1y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      };
      where.createdAt = { gte: periodMap[period] };
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          receipt: true,
          subscription: { include: { plan: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.payment.count({ where }),
    ]);

    return successResponse(payments, {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при получении платежей', 500);
  }
}
