import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Дефолтные виджеты для новых пользователей
const DEFAULT_WIDGETS = [
  { type: 'objects',                title: 'Объекты',           position: 0, colSpan: 2, isVisible: true },
  { type: 'contracts_status',       title: 'Статус договоров',  position: 1, colSpan: 1, isVisible: true },
  { type: 'id_readiness',           title: 'Готовность ИД',     position: 2, colSpan: 2, isVisible: true },
  { type: 'defects_monitor',        title: 'Дефектовка',        position: 3, colSpan: 1, isVisible: true },
  { type: 'smr_progress',           title: 'Прогресс СМР',      position: 4, colSpan: 1, isVisible: true },
  { type: 'id_quality',             title: 'Качество ИД',       position: 5, colSpan: 1, isVisible: true },
  { type: 'construction_progress',  title: 'Ход строительства', position: 6, colSpan: 2, isVisible: true },
  { type: 'map',                    title: 'Карта объектов',            position: 7,  colSpan: 3, isVisible: true  },
  { type: 'issues',                 title: 'Актуальные вопросы',        position: 8,  colSpan: 2, isVisible: false },
  { type: 'contracts_by_type',      title: 'Контрактация по контрактам',position: 9,  colSpan: 2, isVisible: false },
  { type: 'stages',                 title: 'Стадии реализации',         position: 10, colSpan: 1, isVisible: false },
];

// Типы виджетов которые добавляются к существующим пользователям при обновлении
const NEW_WIDGET_TYPES = ['objects', 'map', 'issues', 'contracts_by_type', 'stages'];

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    let widgets = await db.dashboardWidget.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });

    // Если виджетов нет — создаём дефолтный набор
    if (widgets.length === 0) {
      await db.dashboardWidget.createMany({
        data: DEFAULT_WIDGETS.map((w) => ({ ...w, userId })),
      });
      widgets = await db.dashboardWidget.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      });
    } else {
      // Добавляем новые типы виджетов существующим пользователям
      const existingTypes = new Set(widgets.map((w) => w.type));
      const maxPosition = Math.max(...widgets.map((w) => w.position), 0);
      const missing = DEFAULT_WIDGETS.filter(
        (w) => NEW_WIDGET_TYPES.includes(w.type) && !existingTypes.has(w.type)
      );
      if (missing.length > 0) {
        await db.dashboardWidget.createMany({
          data: missing.map((w, i) => ({ ...w, position: maxPosition + i + 1, userId })),
        });
        widgets = await db.dashboardWidget.findMany({
          where: { userId },
          orderBy: { position: 'asc' },
        });
      }
    }

    return successResponse(widgets);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения виджетов дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createWidgetSchema = z.object({
  type:      z.string().min(1),
  title:     z.string().min(1),
  position:  z.number().int().min(0).default(0),
  colSpan:   z.number().int().min(1).max(3).default(1),
  isVisible: z.boolean().default(true),
  config:    z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const body: unknown = await req.json();
    const parsed = createWidgetSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const widget = await db.dashboardWidget.create({
      data: { ...parsed.data, userId: session.user.id },
    });

    return successResponse(widget);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания виджета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
