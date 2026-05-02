import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Уведомление гостя о новых фотографиях на объекте строительства.
 */
export async function notifyGuestNewPhoto(
  guestUserId: string,
  projectName: string,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: guestUserId,
        type: 'GUEST_NEW_PHOTO',
        title: 'Новые фотографии',
        body: `Добавлены новые фотографии на объекте «${projectName}»`,
        entityType: 'BuildingObject',
        entityName: projectName,
      },
    });
  } catch (err) {
    logger.error({ err, guestUserId }, '[guest-notify] ошибка уведомления о фото');
  }
}

/**
 * Уведомление гостя о документе, ожидающем подписания.
 */
export async function notifyGuestDocumentForSign(
  guestUserId: string,
  docId: string,
  docTitle: string,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: guestUserId,
        type: 'GUEST_DOCUMENT_FOR_SIGN',
        title: 'Документ ожидает подписания',
        body: `Документ «${docTitle}» готов к подписанию`,
        entityType: 'ExecutionDoc',
        entityId: docId,
        entityName: docTitle,
      },
    });
  } catch (err) {
    logger.error({ err, guestUserId, docId }, '[guest-notify] ошибка уведомления о документе');
  }
}

/**
 * Уведомление гостя об ответе на его комментарий.
 */
export async function notifyGuestCommentResponse(
  guestUserId: string,
  projectName: string,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: guestUserId,
        type: 'GUEST_COMMENT_RESPONSE',
        title: 'Ответ на ваш комментарий',
        body: `Получен ответ на ваш комментарий на объекте «${projectName}»`,
        entityType: 'GuestComment',
        entityName: projectName,
      },
    });
  } catch (err) {
    logger.error({ err, guestUserId }, '[guest-notify] ошибка уведомления об ответе');
  }
}
