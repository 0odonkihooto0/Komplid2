import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Группы показателей ЦУС (фиксированный список)
const INDICATOR_GROUPS = [
  'Общая информация',
  'Градостроительная проработка',
  'Информация по СМР и АВР',
  'Структура капитальных затрат',
  'Статус реализации',
  'Контракты ПИР',
  'Данные по контрактам СК и СМР',
  'ТУ для строительства',
] as const;

const createSchema = z.object({
  groupName: z.string().min(1, 'Укажите группу'),
  indicatorName: z.string().min(1, 'Укажите наименование показателя'),
  value: z.string().optional(),
  comment: z.string().optional(),
  maxValue: z.string().optional(),
  fileKeys: z.array(z.string()).optional(),
});

// GET /api/projects/[projectId]/project-indicators
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { organizationId } = session.user;

    // Проверяем принадлежность объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Ручные показатели из БД
    const indicators = await db.projectIndicator.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Группировка ручных показателей по groupName
    const groups: Record<string, typeof indicators> = {};
    for (const group of INDICATOR_GROUPS) {
      groups[group] = [];
    }
    for (const ind of indicators) {
      if (!groups[ind.groupName]) groups[ind.groupName] = [];
      groups[ind.groupName].push(ind);
    }

    // Автозаполнение: контракты ПИР (name содержит 'ПИР', статус активный или завершённый)
    const pirContracts = await db.contract.findMany({
      where: {
        projectId: params.projectId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        name: { contains: 'ПИР', mode: 'insensitive' },
      },
      select: { id: true, name: true, totalAmount: true, startDate: true, endDate: true },
    });

    // Автозаполнение: технические условия
    const technicalConditions = await db.technicalCondition.findMany({
      where: { projectId: params.projectId },
      select: {
        id: true,
        type: true,
        connectionAvailability: true,
        issuingAuthority: true,
        expirationDate: true,
        number: true,
      },
      orderBy: { type: 'asc' },
    });

    return successResponse({ groups, pirContracts, technicalConditions });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения показателей проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST /api/projects/[projectId]/project-indicators
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { organizationId } = session.user;

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const indicator = await db.projectIndicator.create({
      data: {
        ...parsed.data,
        fileKeys: parsed.data.fileKeys ?? [],
        projectId: params.projectId,
        sourceType: 'MANUAL',
      },
    });

    return successResponse(indicator);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания показателя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
