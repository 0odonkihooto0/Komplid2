/**
 * Backfill-скрипт Модуля 15, Фаза 1.
 * Создаёт COMPANY воркспейсы для всех существующих организаций без воркспейса,
 * затем проставляет workspaceId на BuildingObject и activeWorkspaceId на User.
 *
 * Запуск: npx ts-node --project tsconfig.scripts.json scripts/backfill-workspace-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function generateSlug(name: string, uniquePart: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `${base}-${uniquePart.slice(-6)}`;
}

async function main() {
  console.log('=== Backfill Workspace IDs — Модуль 15 Фаза 1 ===');

  // 1. Найти все организации без воркспейса
  const orgsWithoutWorkspace = await db.organization.findMany({
    where: { workspace: null },
    include: {
      users: {
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  console.log(`Организаций без воркспейса: ${orgsWithoutWorkspace.length}`);

  for (const org of orgsWithoutWorkspace) {
    const adminUser = org.users[0];
    if (!adminUser) {
      // Нет admin — берём любого пользователя
      const anyUser = await db.user.findFirst({ where: { organizationId: org.id } });
      if (!anyUser) {
        console.warn(`Организация ${org.id} (${org.name}) не имеет пользователей — пропускаем`);
        continue;
      }
    }
    const ownerId = adminUser?.id ?? (await db.user.findFirst({ where: { organizationId: org.id } }))!.id;
    const slug = generateSlug(org.name, org.id);

    await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          type: 'COMPANY',
          name: org.name,
          slug,
          organizationId: org.id,
          ownerId,
          members: {
            create: { userId: ownerId, role: 'OWNER' },
          },
        },
      });
      console.log(`  Создан воркспейс "${workspace.name}" (${workspace.id}) для организации ${org.id}`);
    });
  }

  // 2. Проставить workspaceId на BuildingObject
  const objectsWithoutWorkspace = await db.buildingObject.findMany({
    where: { workspaceId: null },
    select: { id: true, organizationId: true },
  });

  console.log(`\nОбъектов без workspaceId: ${objectsWithoutWorkspace.length}`);

  // Получить маппинг organizationId → workspaceId
  const workspaces = await db.workspace.findMany({
    where: { organizationId: { not: null } },
    select: { id: true, organizationId: true },
  });
  const orgToWorkspace = new Map(workspaces.map((w) => [w.organizationId!, w.id]));

  for (const obj of objectsWithoutWorkspace) {
    const workspaceId = orgToWorkspace.get(obj.organizationId);
    if (!workspaceId) {
      console.warn(`  Нет воркспейса для организации ${obj.organizationId} — пропускаем объект ${obj.id}`);
      continue;
    }
    await db.buildingObject.update({ where: { id: obj.id }, data: { workspaceId } });
  }
  console.log(`  workspaceId проставлен на ${objectsWithoutWorkspace.length} объектах`);

  // 3. Проставить activeWorkspaceId на User
  const usersWithoutWorkspace = await db.user.findMany({
    where: { activeWorkspaceId: null },
    select: { id: true, organizationId: true },
  });

  console.log(`\nПользователей без activeWorkspaceId: ${usersWithoutWorkspace.length}`);

  for (const user of usersWithoutWorkspace) {
    const workspaceId = orgToWorkspace.get(user.organizationId);
    if (!workspaceId) {
      console.warn(`  Нет воркспейса для организации ${user.organizationId} — пропускаем пользователя ${user.id}`);
      continue;
    }
    // Добавить как участника воркспейса если ещё нет
    await db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      create: { workspaceId, userId: user.id, role: 'MEMBER' },
      update: {},
    });
    await db.user.update({ where: { id: user.id }, data: { activeWorkspaceId: workspaceId } });
  }
  console.log(`  activeWorkspaceId проставлен на ${usersWithoutWorkspace.length} пользователях`);

  console.log('\n=== Backfill завершён ===');
}

main()
  .catch((err) => {
    console.error('Ошибка backfill:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
