import nodemailer from 'nodemailer';
import type { NotificationJob } from './queue';

// SMTP-транспорт (Yandex Mail / любой SMTP-сервер)
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

// HTML-шаблон письма уведомления
function renderEmailHtml(job: NotificationJob): string {
  const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';
  const entityLink =
    job.entityType && job.entityId
      ? `<p style="margin-top:16px;"><a href="${appUrl}" style="color:#2563EB;text-decoration:none;">Открыть в StroyDocs →</a></p>`
      : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>${job.title}</title></head>
<body style="font-family:sans-serif;background:#f1f5f9;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:700;color:#1e2d4f;">StroyDocs</span>
    </div>
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 12px;">${job.title}</h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0;">${job.body}</p>
    ${entityLink}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      Это автоматическое уведомление от StroyDocs. Не отвечайте на это письмо.
    </p>
  </div>
</body>
</html>`;
}

// Отправить письмо по данным задачи
export async function sendNotificationEmail(job: NotificationJob): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP не настроен — письмо не отправлено');
    return;
  }

  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? `"StroyDocs" <${process.env.SMTP_USER}>`;

  await transport.sendMail({
    from,
    to: job.email,
    subject: job.title,
    html: renderEmailHtml(job),
  });
}
