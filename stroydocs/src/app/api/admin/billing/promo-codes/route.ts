import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { DiscountType, PlanCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  code: z.string().min(3).max(50),
  discountType: z.enum(['PERCENT', 'FIXED_AMOUNT', 'TRIAL_DAYS', 'FREE_MONTHS']),
  discountValue: z.number().int().min(1),
  maxDiscountRub: z.number().int().min(1).optional(),
  maxTotalRedemptions: z.number().int().min(1).optional(),
  maxPerUser: z.number().int().min(1).default(1),
  validUntil: z.string().datetime().optional(),
  isFirstPaymentOnly: z.boolean().default(true),
  applicableToCategories: z.array(z.string()).optional(),
  planIds: z.array(z.string().uuid()).optional(),
});

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);

    const codes = await db.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { email: true, firstName: true, lastName: true } },
        applicableToPlans: { include: { plan: { select: { name: true, code: true } } } },
        _count: { select: { redemptions: true } },
      },
    });

    // Вычисляем статус активности промокода
    const now = new Date();
    const codesWithStatus = codes.map((c) => ({
      ...c,
      isActive: (!c.validUntil || c.validUntil > now) &&
        (!c.maxTotalRedemptions || c.redemptionsCount < c.maxTotalRedemptions),
    }));

    return successResponse(codesWithStatus);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const data = parsed.data;
    const code = data.code.toUpperCase().trim();

    // Проверяем уникальность кода
    const existing = await db.promoCode.findUnique({ where: { code } });
    if (existing) return errorResponse('Промокод с таким кодом уже существует', 409);

    // Валидация: PERCENT не более 100
    if (data.discountType === 'PERCENT' && data.discountValue > 100) {
      return errorResponse('Процент скидки не может превышать 100', 400);
    }

    const promo = await db.promoCode.create({
      data: {
        code,
        discountType: data.discountType as DiscountType,
        discountValue: data.discountValue,
        maxDiscountRub: data.maxDiscountRub ?? null,
        maxTotalRedemptions: data.maxTotalRedemptions ?? null,
        maxPerUser: data.maxPerUser,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isFirstPaymentOnly: data.isFirstPaymentOnly,
        applicableToCategories: (data.applicableToCategories ?? []) as PlanCategory[],
        createdByUserId: session.user.id,
      },
    });

    // Привязываем конкретные планы если указаны
    if (data.planIds?.length) {
      await db.promoCodeRule.createMany({
        data: data.planIds.map((planId) => ({ promoCodeId: promo.id, planId })),
        skipDuplicates: true,
      });
    }

    return successResponse(promo);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
