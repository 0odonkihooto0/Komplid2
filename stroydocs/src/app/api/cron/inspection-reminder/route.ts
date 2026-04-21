/**
 * Cron-эндпоинт напоминаний об освидетельствовании записей журналов.
 *
 * По ГОСТ Р 70108-2025: исполнитель обязан уведомить надзорные организации
 * о предстоящем освидетельствовании не менее чем за 3 рабочих дня.
 *
 * Расписание: 0 6 * * 1-5 (09:00 МСК, Пн–Пт)
 * Авторизация: Bearer CRON_SECRET
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { workingDaysBetween } from '@/utils/workingDays';
import { enqueueNotification } from '@/lib/queue';
import { successResponse, errorResponse } from '@/utils/api';
import { secureCompare } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Аутентификация по Bearer-токену
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const secret = process.env.CRON_SECRET;

    if (!secret || !secureCompare(token, secret)) {
      return errorResponse('Unauthorized', 401);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Горизонт 7 календарных дней покрывает 3 рабочих дня с учётом выходных
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);

    // Записи журналов с приближающимся освидетельствованием
    const entries = await db.specialJournalEntry.findMany({
      where: {
        inspectionDate: { gte: today, lte: horizon },
        inspectionNotificationSent: false,
        journal: { status: 'ACTIVE' },
      },
      include: {
        journal: {
          include: {
            responsible: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            project: { select: { name: true } },
          },
        },
      },
    });

    // Собираем данные для пакетного создания уведомлений
    const toCreate: {
      userId: string;
      type: string;
      title: string;
      body: string;
      entityType: string;
      entityId: string;
      entityName: string;
    }[] = [];
    const toEnqueue: {
      userId: string;
      email: string;
      type: string;
      title: string;
      body: string;
      entityType: string;
      entityId: string;
      entityName: string;
    }[] = [];
    const notifiedIds: string[] = [];

    for (const entry of entries) {
      const daysUntil = workingDaysBetween(today, entry.inspectionDate!);

      // Уведомляем только за 1, 2 или 3 рабочих дня
      if (daysUntil < 1 || daysUntil > 3) continue;

      const { journal } = entry;
      const objectName = journal.project.name;
      const dateStr = entry.inspectionDate!.toLocaleDateString('ru-RU');

      const title = `Освидетельствование через ${daysUntil} раб. дн.: запись №${entry.entryNumber}`;
      const body =
        `Объект: ${objectName}. Журнал: «${journal.title}» (${journal.number}). ` +
        `Дата: ${dateStr}. ${entry.description}`;

      toCreate.push({
        userId: journal.responsible.id,
        type: 'inspection_reminder',
        title,
        body,
        entityType: 'SpecialJournalEntry',
        entityId: entry.id,
        entityName: `Запись №${entry.entryNumber}`,
      });

      toEnqueue.push({
        userId: journal.responsible.id,
        email: journal.responsible.email,
        type: 'inspection_reminder',
        title,
        body,
        entityType: 'SpecialJournalEntry',
        entityId: entry.id,
        entityName: `Запись №${entry.entryNumber}`,
      });

      notifiedIds.push(entry.id);
    }

    // Пакетное создание уведомлений, постановка в очередь и обновление статуса записей
    try {
      await db.notification.createMany({ data: toCreate });
      for (const item of toEnqueue) await enqueueNotification(item);
      // Помечаем все записи как уведомлённые (идемпотентность при повторном запуске)
      await db.specialJournalEntry.updateMany({
        where: { id: { in: notifiedIds } },
        data: { inspectionNotificationSent: true },
      });
    } catch (batchErr) {
      logger.error({ err: batchErr }, 'Ошибка пакетной отправки уведомлений об освидетельствовании');
      return errorResponse('Internal server error', 500);
    }

    const sentCount = toCreate.length;

    logger.info(
      { total: entries.length, sent: sentCount },
      'Cron inspection-reminder завершён'
    );

    return successResponse({ sent: sentCount });
  } catch (err) {
    logger.error({ err }, 'Cron inspection-reminder: критическая ошибка');
    return errorResponse('Internal server error', 500);
  }
}
