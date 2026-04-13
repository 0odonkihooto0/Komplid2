/**
 * Парсер XML-файлов MS Project для импорта ГПР.
 *
 * Формат: <Project> → <Tasks> → <Task> с вложенными <PredecessorLink>.
 * UID 0 — сводная задача проекта, пропускается.
 */

import { parseStringPromise } from 'xml2js';

import type { ParsedDep, ParsedTask, ParseResult } from './types';

/** Маппинг кода типа связи MSP → наш формат */
const DEP_TYPE_MAP: Record<string, ParsedDep['type']> = {
  '0': 'FF',
  '1': 'FS',
  '2': 'SF',
  '3': 'SS',
};

/** 1 день = 10 (десятых минуты) × 60 мин × 24 ч = 14400 */
const LAG_TENTHS_PER_DAY = 14400;

interface MspPredecessorLink {
  PredecessorUID?: string[];
  Type?: string[];
  LinkLag?: string[];
}

interface MspTask {
  UID?: string[];
  Name?: string[];
  Start?: string[];
  Finish?: string[];
  PercentComplete?: string[];
  OutlineLevel?: string[];
  Summary?: string[];
  Milestone?: string[];
  PredecessorLink?: MspPredecessorLink[];
}

interface MspProject {
  Project?: {
    Tasks?: Array<{ Task?: MspTask[] }>;
  };
}

export async function parseMsProjectXml(buffer: Buffer): Promise<ParseResult> {
  const tasks: ParsedTask[] = [];
  const dependencies: ParsedDep[] = [];
  const warnings: string[] = [];

  const parsed: MspProject = await parseStringPromise(buffer.toString('utf-8'), {
    explicitArray: true,
    ignoreAttrs: false,
    trim: true,
  });

  const mspTasks = parsed.Project?.Tasks?.[0]?.Task;
  if (!mspTasks || mspTasks.length === 0) {
    warnings.push('В XML нет элементов <Task>');
    return { tasks, dependencies, warnings };
  }

  // Стек родительских UID по уровню вложенности
  const parentStack: string[] = [];

  for (const t of mspTasks) {
    const uid = t.UID?.[0] ?? '';
    if (!uid || uid === '0') continue; // Пропуск сводной задачи проекта

    const name = t.Name?.[0] ?? '';
    const rawStart = t.Start?.[0];
    const rawFinish = t.Finish?.[0];

    // Обработка отсутствующих дат
    let planStart: Date;
    let planEnd: Date;

    if (!rawStart && !rawFinish) {
      warnings.push(`Задача UID=${uid} "${name}": отсутствуют Start и Finish — пропущена`);
      continue;
    } else if (!rawStart) {
      planStart = new Date(rawFinish as string);
      planEnd = new Date(rawFinish as string);
      warnings.push(`Задача UID=${uid} "${name}": отсутствует Start, использована Finish`);
    } else if (!rawFinish) {
      planStart = new Date(rawStart);
      planEnd = new Date(rawStart);
      warnings.push(`Задача UID=${uid} "${name}": отсутствует Finish, использована Start`);
    } else {
      planStart = new Date(rawStart);
      planEnd = new Date(rawFinish);
    }

    const percent = t.PercentComplete?.[0] ? Number(t.PercentComplete[0]) : 0;
    const mspLevel = t.OutlineLevel?.[0] ? Number(t.OutlineLevel[0]) : 1;
    const level = Math.max(0, mspLevel - 1); // MSP level 1 → наш 0
    const isMilestone = t.Milestone?.[0] === '1';

    // Определяем родителя по стеку уровней
    parentStack.length = level; // Обрезаем стек до текущего уровня
    const parentExternalId = level > 0 ? (parentStack[level - 1] ?? null) : null;
    parentStack[level] = uid;

    tasks.push({
      externalId: uid,
      name,
      planStart,
      planEnd,
      progress: Number.isFinite(percent) ? percent : 0,
      level,
      parentExternalId,
      isMilestone,
    });

    // Зависимости (PredecessorLink вложены в Task)
    if (t.PredecessorLink) {
      for (const link of t.PredecessorLink) {
        const predUid = link.PredecessorUID?.[0];
        if (!predUid || predUid === '0') continue;

        const typeCode = link.Type?.[0] ?? '1';
        const depType = DEP_TYPE_MAP[typeCode] ?? 'FS';

        const rawLag = link.LinkLag?.[0] ? Number(link.LinkLag[0]) : 0;
        const lagDays = Number.isFinite(rawLag) ? rawLag / LAG_TENTHS_PER_DAY : 0;

        dependencies.push({
          predecessorExternalId: predUid,
          successorExternalId: uid,
          type: depType,
          lagDays: Math.round(lagDays * 100) / 100, // Округление до сотых дня
        });
      }
    }
  }

  return { tasks, dependencies, warnings };
}
