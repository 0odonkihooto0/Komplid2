import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { AiComplianceCheck } from '@prisma/client';
import { RULES, type RuleContext, type RuleViolation } from './rules';
import { callYandexGptForCompliance, callGeminiFallback } from './prompts';

async function gatherContext(check: AiComplianceCheck): Promise<RuleContext> {
  const [docs, workRecords, defects, photos, journalEntries, journals, contracts] =
    await Promise.all([
      db.executionDoc.findMany({
        where: { contract: { projectId: check.projectId } },
        take: 500,
      }),
      db.workRecord.findMany({
        where: { contract: { projectId: check.projectId } },
        take: 500,
      }),
      db.defect.findMany({
        where: { projectId: check.projectId },
        take: 200,
      }),
      db.photo.findMany({
        where: {
          author: {
            organizationId: {
              // Нет прямой связи Photo → project; фильтруем по entityId из workRecords
              // (загружаем все фото организации, фильтрацию делаем в памяти по entityId)
              not: undefined,
            },
          },
        },
        take: 300,
      }),
      db.specialJournalEntry.findMany({
        where: { journal: { projectId: check.projectId } },
        take: 500,
      }),
      db.specialJournal.findMany({
        where: { projectId: check.projectId },
        take: 50,
      }),
      db.contract.findMany({
        where: { projectId: check.projectId },
        take: 50,
      }),
    ]);

  // Фильтруем фото: только те, что привязаны к workRecord-ам этого проекта
  const workRecordIds = new Set(workRecords.map((w) => w.id));
  const projectPhotos = photos.filter(
    (p) =>
      (p.entityType === 'WORK_RECORD' && workRecordIds.has(p.entityId)) ||
      p.entityType === 'DEFECT' ||
      p.entityType === 'INSPECTION',
  );

  return {
    docs,
    workRecords,
    defects,
    photos: projectPhotos,
    journalEntries,
    journals,
    contracts,
    projectId: check.projectId,
  };
}

function generateSummary(violations: RuleViolation[]): string {
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const v of violations) {
    counts[v.severity]++;
  }

  const parts: string[] = [];
  if (counts.CRITICAL > 0) parts.push(`${counts.CRITICAL} критичных`);
  if (counts.HIGH > 0) parts.push(`${counts.HIGH} высоких`);
  if (counts.MEDIUM > 0) parts.push(`${counts.MEDIUM} средних`);
  if (counts.LOW > 0) parts.push(`${counts.LOW} низких`);
  if (counts.INFO > 0) parts.push(`${counts.INFO} информационных`);

  if (parts.length === 0) return 'Нарушений не обнаружено ✓';
  return `Найдено нарушений: ${parts.join(', ')}`;
}

export async function runComplianceCheck(checkId: string): Promise<void> {
  const check = await db.aiComplianceCheck.findUnique({ where: { id: checkId } });
  if (!check) throw new Error(`AiComplianceCheck ${checkId} не найдена`);

  await db.aiComplianceCheck.update({
    where: { id: checkId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  logger.info({ checkId, projectId: check.projectId }, '[compliance] Начало проверки ИД');

  try {
    // Шаг 1: Собрать контекст
    const ctx = await gatherContext(check);

    logger.info(
      { checkId, docs: ctx.docs.length, workRecords: ctx.workRecords.length },
      '[compliance] Контекст собран',
    );

    // Шаг 2: Детерминированные правила
    const deterministicViolations = RULES.flatMap((rule) => {
      try {
        return rule(ctx);
      } catch (err) {
        logger.warn({ err }, '[compliance] Ошибка в детерминированном правиле, пропускаем');
        return [];
      }
    });

    logger.info(
      { checkId, deterministicCount: deterministicViolations.length },
      '[compliance] Детерминированные правила выполнены',
    );

    // Шаг 3: AI-расширение через YandexGPT (с fallback на Gemini)
    let aiResult = { violations: [] as RuleViolation[], tokensUsed: 0 };
    try {
      aiResult = await callYandexGptForCompliance(ctx, deterministicViolations);
      if (aiResult.violations.length === 0 && aiResult.tokensUsed === 0) {
        // YandexGPT недоступен или ключи не настроены — пробуем Gemini
        aiResult = await callGeminiFallback(ctx, deterministicViolations);
      }
    } catch (err) {
      logger.warn({ err, checkId }, '[compliance] AI-проверка не выполнена, используем только правила');
    }

    logger.info(
      { checkId, aiCount: aiResult.violations.length, tokensUsed: aiResult.tokensUsed },
      '[compliance] AI-расширение выполнено',
    );

    const allViolations = [...deterministicViolations, ...aiResult.violations];
    const summary = generateSummary(allViolations);

    // Шаг 4: Сохранить результаты в транзакции
    await db.$transaction(async (tx) => {
      if (allViolations.length > 0) {
        await tx.aiComplianceIssue.createMany({
          data: allViolations.map((v) => ({
            checkId,
            severity: v.severity,
            category: v.category,
            title: v.title,
            description: v.description,
            affectedDocIds: v.affectedDocIds,
            affectedJournalIds: v.affectedJournalIds,
            suggestedFix: v.suggestedFix ?? null,
            standard: v.standard ?? null,
          })),
        });
      }

      await tx.aiComplianceCheck.update({
        where: { id: checkId },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          issueCount: allViolations.length,
          checkedDocs: ctx.docs.length,
          tokensUsed: aiResult.tokensUsed,
          summary,
        },
      });
    });

    // Шаг 5: Уведомление инициатору
    await db.notification.create({
      data: {
        userId: check.initiatedById,
        type: 'compliance_check_completed',
        title: 'AI-проверка ИД завершена',
        body: summary,
        entityType: 'AiComplianceCheck',
        entityId: checkId,
      },
    });

    logger.info({ checkId, issueCount: allViolations.length }, '[compliance] Проверка завершена');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, checkId }, '[compliance] Проверка провалилась');

    await db.aiComplianceCheck.update({
      where: { id: checkId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage,
      },
    });
    throw err;
  }
}
