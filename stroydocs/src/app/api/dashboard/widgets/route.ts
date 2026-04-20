import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Дефолтные виджеты для новых пользователей
const DEFAULT_WIDGETS = [
  { type: 'objects_base',           title: 'База объектов',     position: 0, colSpan: 1, isVisible: true },
  { type: 'objects',                title: 'Объекты (список)',  position: 21, colSpan: 2, isVisible: false },
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
  { type: 'gpr_monitoring',        title: 'Мониторинг ГПР, СМР',       position: 11, colSpan: 2, isVisible: false },
  { type: 'sk_monitoring_chart',   title: 'СК: диаграмма недостатков', position: 12, colSpan: 1, isVisible: false },
  { type: 'sk_monitoring_table',   title: 'СК: таблица мониторинга',   position: 13, colSpan: 2, isVisible: false },
  { type: 'defect_status',           title: 'Недостатки по статусам',        position: 14, colSpan: 1, isVisible: false },
  { type: 'funding_plan',            title: 'Общий план финансирования',      position: 15, colSpan: 2, isVisible: false },
  { type: 'contracts_payment_bar',   title: 'Оплата по контрактам (график)',  position: 16, colSpan: 2, isVisible: false },
  { type: 'contracts_payment_donut', title: 'Статус оплаты (сводно)',         position: 17, colSpan: 1, isVisible: false },
  { type: 'smr_osvoeno',             title: 'Освоено по контрактам, СМР',    position: 18, colSpan: 1, isVisible: false },
  { type: 'financing_status',        title: 'Статус по финансированию',       position: 19, colSpan: 2, isVisible: false },
  { type: 'paid_by_project',         title: 'Оплачено по проекту',           position: 20, colSpan: 2, isVisible: false },
];

// Типы виджетов которые добавляются к существующим пользователям при обновлении
const NEW_WIDGET_TYPES = [
  'objects_base', 'objects', 'map', 'issues', 'contracts_by_type', 'stages',
  'gpr_monitoring', 'sk_monitoring_chart', 'sk_monitoring_table',
  'defect_status', 'funding_plan', 'contracts_payment_bar',
  'contracts_payment_donut', 'smr_osvoeno', 'financing_status', 'paid_by_project',
];

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
  config:    z.record(z.unknown()).optional(),
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
