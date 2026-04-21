import { NextResponse } from 'next/server';
import type { ApiResponse, PaginationMeta } from '@/types/api';
import { PaymentRequiredError, LimitExceededError } from '@/lib/subscriptions/errors';

export function successResponse<T>(data: T, meta?: PaginationMeta): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, meta } as ApiResponse<T>);
}

export function errorResponse(error: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json(
    { success: false, error, details } as ApiResponse<never>,
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof PaymentRequiredError) {
    return NextResponse.json(
      {
        success: false,
        error: 'PaymentRequired',
        feature: error.feature,
        upgradePlanCode: error.upgradePlanCode ?? null,
        message: 'Эта функция требует обновления тарифа',
      },
      { status: 402 }
    );
  }
  if (error instanceof LimitExceededError) {
    return NextResponse.json(
      {
        success: false,
        error: 'LimitExceeded',
        limitKey: error.limitKey,
        limit: error.limit,
        current: error.current,
        message: `Превышен лимит "${error.limitKey}"`,
      },
      { status: 403 }
    );
  }
  if (error instanceof NextResponse) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
  return errorResponse(message, 500);
}
