import { NextResponse } from 'next/server';
import type { ApiResponse, PaginationMeta } from '@/types/api';

export function successResponse<T>(data: T, meta?: PaginationMeta): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, meta } as ApiResponse<T>);
}

export function errorResponse(error: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json(
    { success: false, error, details } as ApiResponse<never>,
    { status }
  );
}
