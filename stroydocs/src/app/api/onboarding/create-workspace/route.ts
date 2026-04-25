import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  // inn, region, specializations собираются в UI, но хранятся в User.onboardingStep metadata
  // Workspace модель этих полей не имеет — они планируются в будущей миграции
  inn: z.string().max(12).optional(),
  region: z.string().max(100).optional(),
  specializations: z.array(z.string()).default([]),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    + '-' + Math.random().toString(36).slice(2, 7);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Неверные данные', 400, parsed.error.issues);
  }

  const { name } = parsed.data;
  const userId = session.user.id;

  // Проверить, нет ли уже workspace у пользователя (как OWNER)
  const existingMember = await db.workspaceMember.findFirst({
    where: { userId, role: 'OWNER', status: 'ACTIVE' },
  });
  if (existingMember) {
    await db.user.update({
      where: { id: userId },
      data: {
        activeWorkspaceId: existingMember.workspaceId,
        onboardingStep: 'WORKSPACE_CREATED',
      },
    });
    return successResponse({ workspaceId: existingMember.workspaceId });
  }

  // Определяем тип workspace по accountType пользователя
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { accountType: true },
  });
  const workspaceType = user?.accountType === 'INDIVIDUAL' || user?.accountType === 'SELF_EMPLOYED'
    ? 'PERSONAL' as const
    : 'COMPANY' as const;

  const result = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug: generateSlug(name),
        type: workspaceType,
        ownerId: userId,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        activeWorkspaceId: workspace.id,
        onboardingStep: 'WORKSPACE_CREATED',
      },
    });

    return { workspaceId: workspace.id };
  });

  return successResponse(result);
}
