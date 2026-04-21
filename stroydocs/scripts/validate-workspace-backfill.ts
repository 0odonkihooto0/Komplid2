/**
 * Валидация backfill Модуля 15.
 * Проверяет что все сущности имеют workspaceId / activeWorkspaceId.
 *
 * Запуск: npx ts-node --project tsconfig.scripts.json scripts/validate-workspace-backfill.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('=== Валидация Workspace Backfill ===');
  let ok = true;

  // 1. Все Organization имеют workspace
  const orgsWithoutWorkspace = await db.organization.count({
    where: { workspace: null },
  });
  if (orgsWithoutWorkspace > 0) {
    console.error(`ОШИБКА: ${orgsWithoutWorkspace} организаций без воркспейса`);
    ok = false;
  } else {
    console.log('✓ Все организации имеют воркспейс');
  }

  // 2. Все BuildingObject имеют workspaceId
  const objectsWithoutWorkspace = await db.buildingObject.count({
    where: { workspaceId: null },
  });
  if (objectsWithoutWorkspace > 0) {
    console.error(`ОШИБКА: ${objectsWithoutWorkspace} объектов строительства без workspaceId`);
    ok = false;
  } else {
    console.log('✓ Все объекты строительства имеют workspaceId');
  }

  // 3. Все User имеют activeWorkspaceId
  const usersWithoutWorkspace = await db.user.count({
    where: { activeWorkspaceId: null },
  });
  if (usersWithoutWorkspace > 0) {
    console.error(`ОШИБКА: ${usersWithoutWorkspace} пользователей без activeWorkspaceId`);
    ok = false;
  } else {
    console.log('✓ Все пользователи имеют activeWorkspaceId');
  }

  // Статистика
  const totalWorkspaces = await db.workspace.count();
  const totalMembers = await db.workspaceMember.count();
  console.log(`\nСтатистика: ${totalWorkspaces} воркспейсов, ${totalMembers} участников`);

  if (!ok) {
    console.error('\nВалидация НЕ пройдена. Запустите backfill-workspace-ids.ts');
    process.exit(1);
  } else {
    console.log('\n✓ Валидация пройдена успешно');
  }
}

main()
  .catch((err) => {
    console.error('Ошибка валидации:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
