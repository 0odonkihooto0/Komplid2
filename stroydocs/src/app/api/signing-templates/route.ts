import { NextResponse } from 'next/server';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface SigningTemplate {
  id: string;
  name: string;
  description: string;
}

/** Предопределённые шаблоны подписания (хранение в БД — отдельная задача) */
const SIGNING_TEMPLATES: SigningTemplate[] = [
  {
    id: 'contract-participants',
    name: 'Все участники договора',
    description: 'Все участники из карточки договора в порядке: субподрядчик → подрядчик → застройщик → стройконтроль',
  },
  {
    id: 'contractor-developer',
    name: 'Подрядчик + Заказчик',
    description: 'Два подписанта: представитель подрядчика и представитель застройщика',
  },
  {
    id: 'developer-only',
    name: 'Только заказчик',
    description: 'Один подписант: представитель застройщика',
  },
];

/** GET — список шаблонов подписания */
export async function GET() {
  try {
    await getSessionOrThrow();
    return successResponse(SIGNING_TEMPLATES);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблонов подписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
