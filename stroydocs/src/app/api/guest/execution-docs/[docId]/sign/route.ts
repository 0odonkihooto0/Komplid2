import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';
import { sendSms } from '@/lib/sms';
import { sendNotificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// TTL кода подтверждения — 10 минут
const CODE_TTL_SECONDS = 600;

export async function POST(
  req: Request,
  { params }: { params: { docId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const activeWorkspaceId = session.user.activeWorkspaceId;
    if (!activeWorkspaceId) return errorResponse('Нет активного workspace', 403);

    // Проверка что пользователь — гость в этом workspace
    const member = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: activeWorkspaceId },
    });
    if (!member || member.role !== 'GUEST') return errorResponse('Нет доступа', 403);

    const scope = guestScopeSchema.parse(member.guestScope);

    // Проверка разрешения на подпись актов
    if (!scope.permissions.canSignActs) {
      return errorResponse('Подпись документов запрещена', 403);
    }

    // Загружаем исполнительный документ с проверкой принадлежности к объекту
    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId },
      include: {
        contract: {
          include: {
            buildingObject: {
              select: { id: true, workspaceId: true },
            },
          },
        },
      },
    });

    if (!doc) return errorResponse('Документ не найден', 404);

    // Проверка multi-tenancy: документ должен принадлежать workspace гостя
    const projectId = doc.contract?.buildingObject?.id;
    const docWorkspaceId = doc.contract?.buildingObject?.workspaceId;

    if (docWorkspaceId !== activeWorkspaceId) {
      return errorResponse('Нет доступа к этому документу', 403);
    }

    // Проверка доступа к конкретному объекту строительства
    if (
      scope.scope !== 'FULL' &&
      projectId &&
      !scope.allowedProjectIds.includes(projectId)
    ) {
      return errorResponse('Нет доступа к объекту этого документа', 403);
    }

    // Генерируем 6-значный код подтверждения
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Хэшируем код через bcrypt (не храним plain text)
    const { hash } = await import('bcryptjs');
    const codeHash = await hash(code, 10);

    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

    // IP и User-Agent для аудит-трейла
    const reqHeaders = req instanceof Request ? req.headers : new Headers();
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? reqHeaders.get('x-real-ip')
      ?? 'unknown';
    const userAgent = reqHeaders.get('user-agent') ?? 'unknown';

    // Создаём запись о подписи со статусом PENDING
    const sig = await db.guestSignature.create({
      data: {
        workspaceId: activeWorkspaceId,
        executionDocId: params.docId,
        signerUserId: session.user.id,
        method: scope.signatureMethod === 'NONE' ? 'EMAIL_CONFIRM' : scope.signatureMethod,
        confirmationCodeHash: codeHash,
        confirmationExpiresAt: expiresAt,
        ipAddress,
        userAgent,
        auditTrail: [
          {
            ts: new Date().toISOString(),
            action: 'INITIATED',
            ipAddress,
            userAgent,
          },
        ],
        status: 'PENDING',
      },
    });

    // Отправляем код в зависимости от метода подписи
    if (scope.signatureMethod === 'SMS') {
      // Берём телефон из профиля пользователя
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true },
      });

      if (user?.phone) {
        await sendSms(
          user.phone,
          `StroyDocs: ваш код подтверждения подписи документа «${doc.title}» — ${code}. Действителен 10 минут.`
        );
      } else {
        logger.warn({ userId: session.user.id }, '[guest/sign] Телефон не найден, SMS не отправлен');
      }
    } else {
      // EMAIL_CONFIRM или SIMPLE_ECP — отправляем email
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, firstName: true, lastName: true },
      });

      if (user?.email) {
        await sendNotificationEmail({
          userId: session.user.id,
          email: user.email,
          type: 'GUEST_SIGN_CODE',
          title: 'Код подтверждения подписи',
          body: `Ваш код для подписи документа «${doc.title}»: <strong>${code}</strong>. Действителен 10 минут.`,
        });
      } else {
        logger.warn({ userId: session.user.id }, '[guest/sign] Email не найден, письмо не отправлено');
      }
    }

    return successResponse({ signatureId: sig.id, expiresIn: CODE_TTL_SECONDS });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка инициации подписи гостем');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
