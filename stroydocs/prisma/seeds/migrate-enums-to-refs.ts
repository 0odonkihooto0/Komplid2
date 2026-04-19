/**
 * Миграционный скрипт: заполнить FK-поля categoryRefId/typeRefId
 * на основе текущих enum-значений в существующих записях.
 *
 * Запускать ОДИН РАЗ вручную после деплоя миграции add_type_refs:
 *   npx ts-node prisma/seeds/migrate-enums-to-refs.ts
 *
 * Идемпотентен: повторный запуск обновляет только записи с categoryRefId=null / typeRefId=null.
 *
 * TODO: В следующей major-версии удалить enum поля category/type, оставить только FK.
 */

import { PrismaClient } from '@prisma/client';

const BATCH = 100;

const prisma = new PrismaClient();

async function migrateDefects(): Promise<number> {
  let updated = 0;
  let skip = 0;

  // Предзагружаем маппинг code → id из справочника
  const refs = await prisma.defectCategoryRef.findMany({ select: { id: true, code: true } });
  const refMap = new Map(refs.map((r) => [r.code, r.id]));

  if (refMap.size === 0) {
    console.warn('⚠️  DefectCategoryRef пуст — запустите seed перед миграцией');
    return 0;
  }

  for (;;) {
    const batch = await prisma.defect.findMany({
      where: { categoryRefId: null },
      select: { id: true, category: true },
      take: BATCH,
      skip,
    });

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map((d) => {
        const refId = refMap.get(d.category);
        if (!refId) return Promise.resolve(null);
        return prisma.defect.update({ where: { id: d.id }, data: { categoryRefId: refId } });
      })
    );

    const count = results.filter(Boolean).length;
    updated += count;
    skip += BATCH - count; // пропускаем уже-обработанные без refId
    console.log(`  defects: обработано ${skip + count}...`);
  }

  return updated;
}

async function migrateProblemIssues(): Promise<number> {
  let updated = 0;
  let skip = 0;

  const refs = await prisma.problemIssueTypeRef.findMany({ select: { id: true, code: true } });
  const refMap = new Map(refs.map((r) => [r.code, r.id]));

  if (refMap.size === 0) {
    console.warn('⚠️  ProblemIssueTypeRef пуст — запустите seed перед миграцией');
    return 0;
  }

  for (;;) {
    const batch = await prisma.problemIssue.findMany({
      where: { typeRefId: null },
      select: { id: true, type: true },
      take: BATCH,
      skip,
    });

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map((i) => {
        const refId = refMap.get(i.type);
        if (!refId) return Promise.resolve(null);
        return prisma.problemIssue.update({ where: { id: i.id }, data: { typeRefId: refId } });
      })
    );

    const count = results.filter(Boolean).length;
    updated += count;
    skip += BATCH - count;
    console.log(`  problem_issues: обработано ${skip + count}...`);
  }

  return updated;
}

async function main() {
  console.log('=== Миграция enum → FK-справочники (REF.5) ===\n');

  const defectsUpdated = await migrateDefects();
  console.log(`✅ Обновлено defects:        ${defectsUpdated}`);

  const issuesUpdated = await migrateProblemIssues();
  console.log(`✅ Обновлено problem_issues: ${issuesUpdated}`);

  console.log('\nМиграция завершена.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
