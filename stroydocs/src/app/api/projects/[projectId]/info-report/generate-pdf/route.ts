import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Заглушка: генерация печатной формы будет реализована в следующей фазе
export async function POST() {
  await getSessionOrThrow();
  return errorResponse('Функция в разработке', 501);
}
