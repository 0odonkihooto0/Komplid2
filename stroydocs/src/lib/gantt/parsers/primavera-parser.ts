/**
 * Парсер файлов Primavera P6 XER.
 * XER — текстовый формат с табуляцией в качестве разделителя.
 */

import type { ParsedTask, ParsedDep, ParseResult } from './types';

interface WbsNode {
  wbsId: string;
  name: string;
  parentWbsId: string | null;
  children: string[];
}

/** Попытка декодировать буфер: сначала UTF-8, при «мусоре» — Windows-1251 */
function decodeBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8');
  // Символ замены U+FFFD — признак битого UTF-8
  if (!utf8.includes('\uFFFD')) return utf8;
  // Fallback на Windows-1251 (типичная кодировка русских XER из Windows)
  const decoder = new TextDecoder('windows-1251');
  return decoder.decode(buffer);
}

/** Парсинг даты формата "YYYY-MM-DD HH:MM" */
function parseXerDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh ?? 0), Number(mm ?? 0));
}

/** Создание Record из массива имён полей и значений строки */
function zipRow(fields: string[], values: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  for (let i = 0; i < fields.length; i++) {
    rec[fields[i]] = values[i] ?? '';
  }
  return rec;
}

const DEP_TYPES = new Set(['FS', 'SS', 'FF', 'SF']);

export function parsePrimaveraXer(buffer: Buffer): ParseResult {
  const text = decodeBuffer(buffer);
  const lines = text.split(/\r?\n/);
  const warnings: string[] = [];

  // Хранилища сырых данных по таблицам
  const rawTasks: Record<string, string>[] = [];
  const rawPreds: Record<string, string>[] = [];
  const rawWbs: Record<string, string>[] = [];
  const rawCalendars: Record<string, string>[] = [];

  // Конечный автомат для разбора таблиц XER
  let currentTable = '';
  let currentFields: string[] = [];

  for (const line of lines) {
    if (line.startsWith('%T')) {
      currentTable = line.split('\t')[1] ?? '';
      currentFields = [];
    } else if (line.startsWith('%F')) {
      currentFields = line.split('\t').slice(1);
    } else if (line.startsWith('%R') && currentFields.length > 0) {
      const values = line.split('\t').slice(1);
      const row = zipRow(currentFields, values);
      if (currentTable === 'TASK') rawTasks.push(row);
      else if (currentTable === 'TASKPRED') rawPreds.push(row);
      else if (currentTable === 'PROJWBS') rawWbs.push(row);
      else if (currentTable === 'CALENDAR') rawCalendars.push(row);
    }
    // %E — конец таблицы, ничего делать не нужно
  }

  // Часов в рабочем дне из CALENDAR (берём первый доступный, иначе 8)
  let defaultDayHours = 8;
  for (const c of rawCalendars) {
    const hrs = parseFloat(c['day_hr_cnt'] ?? '');
    if (!isNaN(hrs) && hrs > 0) { defaultDayHours = hrs; break; }
  }

  // Построение дерева WBS: wbs_id → узел
  const wbsMap = new Map<string, WbsNode>();
  for (const w of rawWbs) {
    const wbsId = w['wbs_id'] ?? '';
    const parentId = w['parent_wbs_id'] ?? '';
    wbsMap.set(wbsId, {
      wbsId,
      name: w['wbs_name'] ?? '',
      parentWbsId: parentId || null,
      children: [],
    });
  }
  // Связываем родительские узлы с дочерними
  for (const node of Array.from(wbsMap.values())) {
    if (node.parentWbsId) {
      wbsMap.get(node.parentWbsId)?.children.push(node.wbsId);
    }
  }

  // Определяем WBS-узлы, к которым привязаны задачи
  const wbsWithTasks = new Set<string>();
  for (const t of rawTasks) {
    wbsWithTasks.add(t['wbs_id'] ?? '');
  }

  // Маппинг task_id → task_code для зависимостей
  const taskIdToCode = new Map<string, string>();

  // Определяем нормализацию прогресса: если все значения <= 1, считаем шкалу 0-1
  let maxProgress = 0;
  for (const t of rawTasks) {
    const val = parseFloat(t['phys_complete_pct'] ?? '0');
    if (!isNaN(val) && val > maxProgress) maxProgress = val;
  }
  const progressMultiplier = maxProgress > 0 && maxProgress <= 1 ? 100 : 1;

  // Генерируем задачи-секции из WBS-узлов с дочерними элементами
  const tasks: ParsedTask[] = [];
  const wbsTaskMap = new Map<string, string>(); // wbs_id → externalId секции

  for (const node of Array.from(wbsMap.values())) {
    // Секция = WBS с дочерними WBS или с привязанными задачами
    if (node.children.length === 0 && !wbsWithTasks.has(node.wbsId)) continue;
    const parentNode = node.parentWbsId ? wbsMap.get(node.parentWbsId) : null;
    const externalId = `WBS-${node.wbsId}`;
    wbsTaskMap.set(node.wbsId, externalId);
    tasks.push({
      externalId,
      name: node.name,
      planStart: new Date(),
      planEnd: new Date(),
      progress: 0,
      level: 0,
      parentExternalId: parentNode ? `WBS-${parentNode.wbsId}` : null,
    });
  }

  // Генерируем задачи из таблицы TASK
  for (const t of rawTasks) {
    const taskId = t['task_id'] ?? '';
    const taskCode = t['task_code'] ?? taskId;
    taskIdToCode.set(taskId, taskCode);

    const planStart = parseXerDate(t['target_start_date'] ?? '');
    const planEnd = parseXerDate(t['target_end_date'] ?? '');
    if (!planStart || !planEnd) {
      warnings.push(`Задача ${taskCode}: невалидные даты, пропущена`);
      continue;
    }

    const isMilestone = (t['task_type'] ?? '').includes('Mile');
    const rawProgress = parseFloat(t['phys_complete_pct'] ?? '0') || 0;
    const floatHrs = parseFloat(t['total_float_hr_cnt'] ?? '');

    const task: ParsedTask = {
      externalId: taskCode,
      name: t['task_name'] ?? '',
      planStart,
      planEnd: isMilestone ? planStart : planEnd,
      factStart: parseXerDate(t['act_start_date'] ?? ''),
      factEnd: parseXerDate(t['act_end_date'] ?? ''),
      progress: Math.round(rawProgress * progressMultiplier),
      level: 1,
      parentExternalId: wbsTaskMap.get(t['wbs_id'] ?? '') ?? null,
      isMilestone,
      totalFloat: !isNaN(floatHrs) ? Math.round(floatHrs / defaultDayHours) : null,
    };
    tasks.push(task);
  }

  // Обновляем даты секций (min/max дочерних задач)
  const childrenByParent = new Map<string, ParsedTask[]>();
  for (const task of tasks) {
    if (task.level === 1 && task.parentExternalId) {
      const arr = childrenByParent.get(task.parentExternalId) ?? [];
      arr.push(task);
      childrenByParent.set(task.parentExternalId, arr);
    }
  }
  for (const section of tasks) {
    if (section.level !== 0) continue;
    const children = childrenByParent.get(section.externalId);
    if (!children || children.length === 0) continue;
    let minStart = children[0].planStart;
    let maxEnd = children[0].planEnd;
    for (const ch of children) {
      if (ch.planStart < minStart) minStart = ch.planStart;
      if (ch.planEnd > maxEnd) maxEnd = ch.planEnd;
    }
    section.planStart = minStart;
    section.planEnd = maxEnd;
  }

  // Генерируем зависимости из TASKPRED
  const dependencies: ParsedDep[] = [];
  for (const p of rawPreds) {
    const successorCode = taskIdToCode.get(p['task_id'] ?? '');
    const predecessorCode = taskIdToCode.get(p['pred_task_id'] ?? '');
    if (!successorCode || !predecessorCode) {
      warnings.push(`Зависимость: неизвестный task_id (${p['task_id']} → ${p['pred_task_id']})`);
      continue;
    }
    const predType = (p['pred_type'] ?? 'FS').toUpperCase();
    const depType = DEP_TYPES.has(predType) ? (predType as ParsedDep['type']) : 'FS';
    const lagHrs = parseFloat(p['lag_hr_cnt'] ?? '0') || 0;

    dependencies.push({
      predecessorExternalId: predecessorCode,
      successorExternalId: successorCode,
      type: depType,
      lagDays: Math.round(lagHrs / defaultDayHours),
    });
  }

  return { tasks, dependencies, warnings };
}
