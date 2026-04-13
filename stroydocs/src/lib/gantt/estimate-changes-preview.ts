import { db } from '@/lib/db';

// Тип позиции в предпросмотре изменений
export type PreviewItemType = 'ESTIMATE' | 'SECTION' | 'ITEM';

// Статус изменения
export type PreviewChangeStatus = 'WILL_DELETE' | 'WILL_CHANGE' | 'WILL_ADD';

export interface PreviewData {
  name: string;
  unit: string | null;
  volume: number | null;
  amount: number | null;
}

export interface EstimateChangePreviewItem {
  type: PreviewItemType;
  name: string;
  status: PreviewChangeStatus;
  currentData?: PreviewData;
  newData?: PreviewData;
  ganttTaskId?: string;
  estimateItemId?: string;
  chapterName?: string;
}

export interface EstimateChangePreviewResult {
  items: EstimateChangePreviewItem[];
  summary: { willAdd: number; willDelete: number; willChange: number };
}

/**
 * Сравнивает текущие задачи ГПР (привязанные к сметным позициям)
 * с позициями новой версии сметы.
 *
 * Стратегия сопоставления позиций:
 * 1. По importItemId (для версий из одного импорта)
 * 2. По code (для позиций из нормативов)
 * 3. По name + unit (нечёткое совпадение)
 */
export async function buildEstimateChangesPreview(
  versionId: string,
  estimateVersionId: string,
): Promise<EstimateChangePreviewResult> {
  // 1. Текущие задачи ГПР: level-1 с estimateItemId + все level-0 (разделы)
  const ganttTasks = await db.ganttTask.findMany({
    where: { versionId },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, name: true, level: true, parentId: true,
      volume: true, volumeUnit: true, amount: true, estimateItemId: true,
    },
  });

  const itemTasks = ganttTasks.filter((t) => t.level === 1 && t.estimateItemId);
  const sectionTasks = ganttTasks.filter((t) => t.level === 0);

  // 2. Получаем старые EstimateItem (для cross-reference по importItemId / code)
  const oldItemIds = itemTasks.map((t) => t.estimateItemId).filter(Boolean) as string[];
  const oldEstimateItems = oldItemIds.length > 0
    ? await db.estimateItem.findMany({ where: { id: { in: oldItemIds } } })
    : [];
  const oldItemById = new Map(oldEstimateItems.map((i) => [i.id, i]));

  // 3. Новая версия сметы: главы + позиции (только WORK, не удалённые)
  const newVersion = await db.estimateVersion.findUniqueOrThrow({
    where: { id: estimateVersionId },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          items: { where: { isDeleted: false, itemType: 'WORK' }, orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  });

  // Индексы для сопоставления новых позиций
  const newByImportId = new Map<string, { item: typeof newVersion.chapters[0]['items'][0]; chapterName: string }>();
  const newByCode = new Map<string, { item: typeof newVersion.chapters[0]['items'][0]; chapterName: string }>();
  const newByNameUnit = new Map<string, { item: typeof newVersion.chapters[0]['items'][0]; chapterName: string }>();
  const allNewItems: Array<{ item: typeof newVersion.chapters[0]['items'][0]; chapterName: string }> = [];

  for (const ch of newVersion.chapters) {
    for (const item of ch.items) {
      const entry = { item, chapterName: ch.name };
      allNewItems.push(entry);
      if (item.importItemId) newByImportId.set(item.importItemId, entry);
      if (item.code) newByCode.set(item.code, entry);
      newByNameUnit.set(`${item.name}|${item.unit ?? ''}`, entry);
    }
  }

  const result: EstimateChangePreviewItem[] = [];
  const matchedNewIds = new Set<string>();

  // 4. Сопоставление level-1 задач ГПР с новыми позициями сметы
  for (const task of itemTasks) {
    const oldItem = task.estimateItemId ? oldItemById.get(task.estimateItemId) : undefined;
    let matched: typeof allNewItems[0] | undefined;

    // Приоритет 1: по importItemId
    if (oldItem?.importItemId) {
      matched = newByImportId.get(oldItem.importItemId);
    }
    // Приоритет 2: по code
    if (!matched && oldItem?.code) {
      matched = newByCode.get(oldItem.code);
    }
    // Приоритет 3: по name + unit
    if (!matched) {
      matched = newByNameUnit.get(`${task.name}|${task.volumeUnit ?? ''}`);
    }

    if (!matched) {
      // Позиция удалена в новой сметне
      result.push({
        type: 'ITEM',
        name: task.name,
        status: 'WILL_DELETE',
        currentData: { name: task.name, unit: task.volumeUnit, volume: task.volume, amount: task.amount },
        ganttTaskId: task.id,
        chapterName: sectionTasks.find((s) => s.id === task.parentId)?.name,
      });
    } else {
      matchedNewIds.add(matched.item.id);
      const ni = matched.item;
      // Проверяем изменения полей
      const changed = task.name !== ni.name
        || task.volumeUnit !== (ni.unit ?? null)
        || task.volume !== (ni.volume ?? null)
        || task.amount !== (ni.totalPrice ?? null);

      if (changed) {
        result.push({
          type: 'ITEM',
          name: ni.name,
          status: 'WILL_CHANGE',
          currentData: { name: task.name, unit: task.volumeUnit, volume: task.volume, amount: task.amount },
          newData: { name: ni.name, unit: ni.unit, volume: ni.volume, amount: ni.totalPrice },
          ganttTaskId: task.id,
          estimateItemId: ni.id,
          chapterName: matched.chapterName,
        });
      }
      // Без изменений — не включаем
    }
  }

  // 5. Новые позиции (не сопоставленные)
  for (const entry of allNewItems) {
    if (matchedNewIds.has(entry.item.id)) continue;
    result.push({
      type: 'ITEM',
      name: entry.item.name,
      status: 'WILL_ADD',
      newData: { name: entry.item.name, unit: entry.item.unit, volume: entry.item.volume, amount: entry.item.totalPrice },
      estimateItemId: entry.item.id,
      chapterName: entry.chapterName,
    });
  }

  // 6. Секции (разделы): по имени главы
  const newChapterNames = new Set(newVersion.chapters.map((ch) => ch.name));
  const currentSectionNames = new Set(sectionTasks.map((s) => s.name));

  for (const section of sectionTasks) {
    if (!newChapterNames.has(section.name)) {
      result.push({ type: 'SECTION', name: section.name, status: 'WILL_DELETE', ganttTaskId: section.id });
    } else {
      // Секция существует в обеих версиях — проверяем есть ли изменения в её позициях
      const hasChangesInSection = result.some((r) => r.type === 'ITEM' && r.chapterName === section.name);
      if (hasChangesInSection) {
        result.push({ type: 'SECTION', name: section.name, status: 'WILL_CHANGE', ganttTaskId: section.id });
      }
    }
  }

  for (const ch of newVersion.chapters) {
    if (!currentSectionNames.has(ch.name)) {
      result.push({ type: 'SECTION', name: ch.name, status: 'WILL_ADD' });
    }
  }

  // 7. Сортировка: SECTION перед ITEM, внутри — по chapterName
  result.sort((a, b) => {
    if (a.type === 'ESTIMATE') return -1;
    if (b.type === 'ESTIMATE') return 1;
    const chA = a.chapterName ?? a.name;
    const chB = b.chapterName ?? b.name;
    if (chA !== chB) return chA.localeCompare(chB, 'ru');
    if (a.type === 'SECTION' && b.type !== 'SECTION') return -1;
    if (a.type !== 'SECTION' && b.type === 'SECTION') return 1;
    return 0;
  });

  const summary = {
    willAdd: result.filter((r) => r.status === 'WILL_ADD' && r.type === 'ITEM').length,
    willDelete: result.filter((r) => r.status === 'WILL_DELETE' && r.type === 'ITEM').length,
    willChange: result.filter((r) => r.status === 'WILL_CHANGE' && r.type === 'ITEM').length,
  };

  // Сводная строка ESTIMATE (если есть изменения)
  if (result.length > 0) {
    result.unshift({
      type: 'ESTIMATE',
      name: newVersion.name,
      status: summary.willChange > 0 ? 'WILL_CHANGE' : summary.willAdd > 0 ? 'WILL_ADD' : 'WILL_DELETE',
    });
  }

  return { items: result, summary };
}
