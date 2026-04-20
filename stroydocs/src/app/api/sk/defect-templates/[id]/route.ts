import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
// DELETE /api/sk/defect-templates/[id] — удалить шаблон своей организации
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionOrThrow();

  const template = await db.defectTemplate.findUnique({
    where: { id: params.id },
  });

  if (!template) {
    return errorResponse('Шаблон не найден', 404);
  }

  // Системные шаблоны удалять нельзя
  if (template.isSystem) {
    return errorResponse('Системный шаблон нельзя удалить', 403);
  }

  // Можно удалить только шаблоны своей организации
  if (template.organizationId !== session.user.organizationId) {
    return errorResponse('Недостаточно прав', 403);
  }

  await db.defectTemplate.delete({ where: { id: params.id } });

  return successResponse({ deleted: true });
}
