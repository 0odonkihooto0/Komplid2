/**
 * BullMQ-воркер для генерации задач по расписанию (Модуль 18 — Планировщик задач).
 *
 * Cron каждые 15 минут: ищет активные TaskSchedule, создаёт Task из шаблона,
 * обновляет lastRunAt, уведомляет автора шаблона.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/task-schedule.worker.ts
 */

import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

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

const SCHEDULE_QUEUE = 'task-schedule';
const CRON_PATTERN = '*/15 * * * *';

function daysDiff(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function weeksDiff(a: Date, b: Date): number {
  return Math.floor(daysDiff(a, b) / 7);
}

function monthsDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function yearsDiff(a: Date, b: Date): number {
  return b.getFullYear() - a.getFullYear();
}

type ScheduleRow = {
  id: string;
  repeatType: string;
  interval: number;
  weekDays: number[];
  monthDays: number[];
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  lastRunAt: Date | null;
  createSubTasks: boolean;
};

function shouldRun(schedule: ScheduleRow, now: Date): boolean {
  if (!schedule.isActive) return false;
  if (now < schedule.startDate) return false;
  if (schedule.endDate && now > schedule.endDate) return false;

  const base = schedule.lastRunAt ?? schedule.startDate;

  switch (schedule.repeatType) {
    case 'DAY':
      return daysDiff(base, now) >= schedule.interval;
    case 'WEEK':
      return (
        weeksDiff(base, now) >= schedule.interval &&
        schedule.weekDays.includes(now.getDay())
      );
    case 'MONTH':
      return (
        monthsDiff(base, now) >= schedule.interval &&
        schedule.monthDays.includes(now.getDate())
      );
    case 'YEAR':
      return yearsDiff(base, now) >= schedule.interval;
    default:
      return false;
  }
}

async function processSchedules(): Promise<void> {
  const now = new Date();

  const schedules = await db.taskSchedule.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: {
      template: {
        include: {
          organization: {
            include: {
              buildingObjects: {
                select: { id: true },
                take: 1,
                orderBy: { createdAt: 'asc' },
              },
            },
          },
          children: {
            select: { id: true, name: true, description: true, priority: true, duration: true },
          },
        },
      },
    },
  });

  for (const schedule of schedules) {
    if (!shouldRun(schedule, now)) continue;

    const template = schedule.template;
    const project = template.organization.buildingObjects[0];

    if (!project) {
      console.warn(
        `[task-schedule] Нет объектов строительства в организации ${template.organizationId}, ` +
        `пропускаем расписание ${schedule.id}`
      );
      continue;
    }

    try {
      await db.$transaction(async (tx) => {
        // Создать задачу из шаблона
        const task = await tx.task.create({
          data: {
            title: template.name,
            description: template.description ?? undefined,
            priority: template.priority,
            duration: template.duration ?? undefined,
            projectId: project.id,
            createdById: template.authorId,
            templateId: template.id,
            typeId: template.typeId ?? undefined,
            groupId: template.groupId ?? undefined,
            sourceType: 'MANUAL',
            status: 'PLANNED',
          },
        });

        // Роль AUTHOR для автора шаблона
        await tx.taskRole.create({
          data: { taskId: task.id, userId: template.authorId, role: 'AUTHOR' },
        });

        // Дочерние задачи если createSubTasks включён
        if (schedule.createSubTasks && template.children.length > 0) {
          for (const child of template.children) {
            const childTask = await tx.task.create({
              data: {
                title: child.name,
                description: child.description ?? undefined,
                priority: child.priority,
                duration: child.duration ?? undefined,
                projectId: project.id,
                parentTaskId: task.id,
                createdById: template.authorId,
                templateId: child.id,
                sourceType: 'MANUAL',
                status: 'PLANNED',
                level: 1,
              },
            });
            await tx.taskRole.create({
              data: { taskId: childTask.id, userId: template.authorId, role: 'AUTHOR' },
            });
          }
        }

        // Обновить lastRunAt
        await tx.taskSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now },
        });

        // Уведомить автора
        await tx.notification.create({
          data: {
            type: 'task_scheduled_created',
            title: 'Создана плановая задача',
            body: `По расписанию создана задача «${task.title}»`,
            userId: template.authorId,
            entityType: 'Task',
            entityId: task.id,
            entityName: task.title,
          },
        });

        console.log(`[task-schedule] Создана задача «${task.title}» из расписания ${schedule.id}`);
      });
    } catch (err) {
      console.error(
        `[task-schedule] Ошибка при создании задачи из расписания ${schedule.id}:`,
        err
      );
    }
  }
}

async function registerCronJob() {
  const queue = new Queue(SCHEDULE_QUEUE, { connection: getRedisOptions() });
  await queue.upsertJobScheduler(
    'task-schedule-check',
    { pattern: CRON_PATTERN },
    { name: 'process-task-schedules', data: {} }
  );
  console.log(`[task-schedule] Cron зарегистрирован: ${CRON_PATTERN}`);
}

const worker = new Worker(
  SCHEDULE_QUEUE,
  async () => {
    console.log('[task-schedule] Запускаю обработку расписаний задач...');
    await processSchedules();
    console.log('[task-schedule] Обработка завершена');
  },
  { connection: getRedisOptions() }
);

worker.on('failed', (job, err) => {
  console.error(`[task-schedule] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[task-schedule] Ошибка воркера:', err);
  }
});

registerCronJob()
  .then(() => console.log('[task-schedule] Воркер готов'))
  .catch((err) => console.error('[task-schedule] Ошибка инициализации:', err));
