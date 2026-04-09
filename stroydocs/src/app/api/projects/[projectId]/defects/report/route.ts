import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён',
  REJECTED: 'Отклонён',
};

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface Params { projectId: string }

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const { projectId } = params;

    // Проверяем что проект принадлежит организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const format = url.searchParams.get('format') ?? 'json';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const defects = await db.defect.findMany({
      where: {
        projectId,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: {
        author:   { select: { firstName: true, lastName: true } },
        assignee: { select: { firstName: true, lastName: true } },
        contract: { select: { number: true } },
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    if (format === 'csv') {
      const headers = [
        'Заголовок',
        'Статус',
        'Категория',
        'Договор',
        'Автор',
        'Ответственный',
        'Создан',
        'Срок',
        'Устранён',
      ];

      const rows = defects.map((d) => [
        d.title,
        STATUS_LABELS[d.status] ?? d.status,
        CATEGORY_LABELS[d.category] ?? d.category,
        d.contract?.number ?? '',
        d.author ? `${d.author.lastName} ${d.author.firstName}` : '',
        d.assignee ? `${d.assignee.lastName} ${d.assignee.firstName}` : '',
        formatDate(d.createdAt),
        formatDate(d.deadline),
        formatDate(d.resolvedAt),
      ]);

      const csvLines = [headers, ...rows]
        .map((row) => row.map(escapeCsvField).join(','))
        .join('\n');

      // BOM для корректного отображения кириллицы в Excel
      const bom = '\uFEFF';
      const csvContent = bom + csvLines;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="defects-${projectId}.csv"`,
        },
      });
    }

    // JSON-формат
    const result = defects.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      category: d.category,
      normativeRef: d.normativeRef,
      contract: d.contract?.number ?? null,
      author: d.author ? `${d.author.lastName} ${d.author.firstName}` : null,
      assignee: d.assignee ? `${d.assignee.lastName} ${d.assignee.firstName}` : null,
      createdAt: d.createdAt,
      deadline: d.deadline,
      resolvedAt: d.resolvedAt,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации отчёта по дефектам');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
