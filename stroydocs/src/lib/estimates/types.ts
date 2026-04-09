/** Тип позиции сметы */
export type EstimateItemType = 'WORK' | 'MATERIAL';

/** Распознанная позиция из сметы (общий формат для всех парсеров) */
export interface ParsedEstimateItem {
  sortOrder: number;
  rawName: string;
  rawUnit: string | null;
  volume: number | null;
  price: number | null;
  total: number | null;
  /** Тип позиции: работа или материал */
  itemType: EstimateItemType;
  /**
   * Индекс родительской работы в массиве items (только для материалов).
   * Используется при сохранении в БД для привязки parentItemId.
   */
  parentIndex?: number;
}

/** Результат парсинга файла сметы */
export interface ParseResult {
  items: ParsedEstimateItem[];
  warnings: string[];
  /** Номера чанков, которые были пропущены по стратегии "Skip & Mark" */
  skippedChunks?: number[];
}
