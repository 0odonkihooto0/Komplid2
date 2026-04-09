import { getServerSession } from 'next-auth';
import { SignJWT } from 'jose';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse } from '@/utils/api';

/**
 * GET /api/auth/socket-token
 * Выдаёт подписанный JWT-токен для аутентификации в Socket.io сервере (TTL 1 час).
 * Используется клиентским хуком useSocket перед установкой WebSocket-соединения.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse('Unauthorized', 401);

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  const token = await new SignJWT({
    userId: session.user.id,
    organizationId: session.user.organizationId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  return successResponse({ token });
}
