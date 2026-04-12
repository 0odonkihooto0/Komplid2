/**
 * BullMQ-воркер напоминаний об освидетельствовании скрытых работ.
 *
 * По ГОСТ Р 70108-2025: исполнитель обязан уведомить надзорные организации
 * о предстоящем освидетельствовании не менее чем за 3 рабочих дня.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/inspection-reminder.worker.ts
 * В продакшне: запускать как отдельный процесс, BullMQ cron каждый день в 09:00 МСК.
 */

import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { workingDaysBetween } from '../../utils/workingDays';
import { enqueueNotification } from '../queue';

// Парсим REDIS_URL в plain-объект опций для BullMQ.
// BullMQ v5 бандлит свою версию ioredis — передача внешнего IORedis-инстанса
// вызывает TypeScript-конфликт типов между двумя копиями пакета.
function getRedisOptions() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const { hostname, port, password, pathname } = new URL(url);
  return {
    host: hostname || 'localhost',
    port: Number(port) || 6379,
    maxRetriesPerRequest: null as null,
    ...(password ? { password: decodeURIComponent(password) } : {}),
    ...(pathname && pathname !== '/' ? { db: Number(pathname.slice(1)) } : {}),
  };
}

const db = new PrismaClient();

const SCHEDULE_QUEUE = 'inspection-schedule';
const CRON_PATTERN = '0 6 * * 1-5'; // 09:00 МСК = 06:00 UTC, Пн–Пт

// Регистрируем repeatable job (cron)
async function registerCronJob() {
  const queue = new Queue(SCHEDULE_QUEUE, { connection: getRedisOptions() });
  await queue.upsertJobScheduler(
    'daily-inspection-check',
    { pattern: CRON_PATTERN },
    { name: 'check-upcoming-inspections', data: {} }
  );
  console.log(`[inspection-reminder] Cron зарегистрирован: ${CRON_PATTERN}`);
}

// Основная логика: ищет записи о работах с датой освидетельствования через 1–3 рабочих дня
async function checkUpcomingInspections() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ищем WorkRecord с plannedDate в пределах 5 дней (перекрываем выходные)
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);

  const workRecords = await db.workRecord.findMany({
    where: {
      date: {
        gte: today,
        lte: horizon,
      },
      status: { not: 'COMPLETED' },
    },
    include: {
      contract: {
        include: {
          buildingObject: { select: { name: true } },
          participants: {
            include: {
              organization: {
                include: {
                  users: {
                    where: {
                      role: { in: ['CONTROLLER', 'CUSTOMER', 'ADMIN'] },
                      isActive: true,
                    },
                    select: { id: true, email: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      },
      workItem: { select: { name: true } },
    },
  });

  for (const record of workRecords) {
    const daysUntil = workingDaysBetween(today, record.date);

    // Отправляем уведомление за 1, 2 или 3 рабочих дня до даты
    if (daysUntil < 1 || daysUntil > 3) continue;

    const workName = record.workItem?.name ?? 'скрытые работы';
    const objectName = record.contract.buildingObject.name;
    const dateStr = record.date.toLocaleDateString('ru-RU');

    const title = `Освидетельствование через ${daysUntil} раб. дн.: ${workName}`;
    const body =
      `Объект: ${objectName}. Дата: ${dateStr}. ` +
      `Работа: «${workName}». Необходимо обеспечить присутствие представителей надзора ` +
      `согласно ГОСТ Р 70108-2025.`;

    // Собираем всех надзорных из участников договора
    const usersToNotify = record.contract.participants.flatMap((p) =>
      p.organization.users
    );

    // Дедупликация по userId
    const uniqueUsers = Array.from(
      new Map(usersToNotify.map((u) => [u.id, u])).values()
    );

    for (const user of uniqueUsers) {
      // Создаём Notification в БД
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'inspection_reminder',
          title,
          body,
          entityType: 'WorkRecord',
          entityId: record.id,
          entityName: workName,
        },
      }).catch(() => {
        // Игнорируем дубликаты — воркер может запуститься несколько раз
      });

      // Ставим email в очередь
      await enqueueNotification({
        userId: user.id,
        email: user.email,
        type: 'inspection_reminder',
        title,
        body,
        entityType: 'WorkRecord',
        entityId: record.id,
        entityName: workName,
      });
    }

    console.log(
      `[inspection-reminder] Уведомлено ${uniqueUsers.length} чел. о работе «${workName}» (через ${daysUntil} р.дн.)`
    );
  }
}

// Воркер обрабатывает задачи из очереди расписания
const worker = new Worker(
  SCHEDULE_QUEUE,
  async () => {
    console.log('[inspection-reminder] Запускаю проверку предстоящих освидетельствований...');
    await checkUpcomingInspections();
    console.log('[inspection-reminder] Проверка завершена');
  },
  { connection: getRedisOptions() }
);

worker.on('failed', (job, err) => {
  console.error(`[inspection-reminder] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[inspection-reminder] Ошибка воркера:', err);
  }
});

// Инициализация
registerCronJob()
  .then(() => console.log('[inspection-reminder] Воркер готов'))
  .catch((err) => console.error('[inspection-reminder] Ошибка инициализации:', err));
