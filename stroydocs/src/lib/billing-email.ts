import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { BillingEmailJob, BillingEmailData } from './queue';
import { logger } from './logger';

// Маппинг типа → имя шаблона
const TYPE_TO_TEMPLATE: Record<string, string> = {
  BILLING_WELCOME: 'subscription-welcome',
  TRIAL_STARTED: 'trial-started',
  TRIAL_ENDING_SOON: 'trial-ending-soon',
  TRIAL_EXPIRED: 'trial-expired',
  RENEWAL_SUCCEEDED: 'renewal-succeeded',
  PAYMENT_FAILED_1: 'payment-failed-1',
  PAYMENT_FAILED_3: 'payment-failed-3',
  PAYMENT_FAILED_FINAL: 'payment-failed-final',
  GRACE_STARTED: 'grace-started',
  SUBSCRIPTION_EXPIRED: 'subscription-expired',
  SUBSCRIPTION_CANCELLED: 'subscription-cancelled',
  RETENTION_DISCOUNT: 'retention-discount',
  PLAN_UPGRADED: 'plan-upgraded',
  PLAN_CHANGE_SCHEDULED: 'plan-change-scheduled',
};

// Темы писем по типу
const EMAIL_SUBJECTS: Record<string, string> = {
  BILLING_WELCOME: 'Добро пожаловать в StroyDocs — подписка активирована',
  TRIAL_STARTED: 'Пробный период StroyDocs начался',
  TRIAL_ENDING_SOON: 'Ваш пробный период заканчивается',
  TRIAL_EXPIRED: 'Пробный период завершён',
  RENEWAL_SUCCEEDED: 'Подписка продлена',
  PAYMENT_FAILED_1: 'Не удалось списать оплату',
  PAYMENT_FAILED_3: 'Проблема с оплатой — обновите карту',
  PAYMENT_FAILED_FINAL: 'Последний шанс восстановить доступ',
  GRACE_STARTED: 'Льготный период — доступ временно сохранён',
  SUBSCRIPTION_EXPIRED: 'Подписка отключена',
  SUBSCRIPTION_CANCELLED: 'Подписка отменена',
  RETENTION_DISCOUNT: 'Специальное предложение для вас',
  PLAN_UPGRADED: 'Тариф успешно изменён',
  PLAN_CHANGE_SCHEDULED: 'Смена тарифа запланирована',
};

// Promise-кэш скомпилированных Handlebars шаблонов (имя → функция рендера)
// Кэшируем Promise, а не результат — гарантирует однократную загрузку при параллельных вызовах
let templateCachePromise: Promise<Map<string, (data: Record<string, unknown>) => string>> | null = null;

function getTemplatesDir(): string {
  return path.join(process.cwd(), 'templates', 'emails', 'billing');
}

async function loadTemplates(): Promise<Map<string, (data: Record<string, unknown>) => string>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Handlebars = require('handlebars') as typeof import('handlebars');
  const dir = getTemplatesDir();
  const cache = new Map<string, (data: Record<string, unknown>) => string>();

  for (const templateName of Object.values(TYPE_TO_TEMPLATE)) {
    const filePath = path.join(dir, `${templateName}.hbs`);
    const src = await fs.promises.readFile(filePath, 'utf-8');
    cache.set(templateName, Handlebars.compile(src));
  }
  return cache;
}

function getTemplateCache(): Promise<Map<string, (data: Record<string, unknown>) => string>> {
  if (!templateCachePromise) {
    templateCachePromise = loadTemplates();
  }
  return templateCachePromise;
}

async function renderTemplate(type: string, data: BillingEmailData): Promise<string> {
  const templateName = TYPE_TO_TEMPLATE[type];
  if (!templateName) throw new Error(`Неизвестный тип биллингового email: ${type}`);
  const cache = await getTemplateCache();
  const render = cache.get(templateName);
  if (!render) throw new Error(`Шаблон не найден: ${templateName}`);
  return render(data as unknown as Record<string, unknown>);
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.yandex.ru',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Отправить биллинговый email по шаблону
export async function sendBillingEmail(job: BillingEmailJob): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('[billing-email] SMTP не настроен — письмо не отправлено');
    return;
  }

  const subject = job.subject || EMAIL_SUBJECTS[job.type] || 'Уведомление StroyDocs';
  const html = await renderTemplate(job.type, job.data);

  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? `"StroyDocs" <${process.env.SMTP_USER}>`;

  await transport.sendMail({
    from,
    to: job.email,
    subject,
    html,
  });
}

export { TYPE_TO_TEMPLATE, EMAIL_SUBJECTS };
