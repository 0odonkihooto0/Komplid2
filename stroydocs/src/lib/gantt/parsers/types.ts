/**
 * Общие типы для парсеров файлов ГПР.
 * Используются как промежуточное представление между парсером и записью в БД.
 */

/** Распарсенная задача из внешнего файла */
export interface ParsedTask {
  /** Внешний идентификатор: task_code (XER), UID (MSP), "№ п/п" (Excel) */
  externalId: string;
  name: string;
  planStart: Date;
  planEnd: Date;
  factStart?: Date | null;
  factEnd?: Date | null;
  /** Прогресс 0-100 */
  progress: number;
  /** 0 = секция/раздел, 1+ = работа */
  level: number;
  parentExternalId?: string | null;
  volume?: number | null;
  volumeUnit?: string | null;
  unitCost?: number | null;
  totalCost?: number | null;
  isMilestone?: boolean;
  /** Общий резерв в днях */
  totalFloat?: number | null;
}

/** Распарсенная зависимость между задачами */
export interface ParsedDep {
  predecessorExternalId: string;
  successorExternalId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
}

/** Результат парсинга файла ГПР */
export interface ParseResult {
  tasks: ParsedTask[];
  dependencies: ParsedDep[];
  /** Некритичные предупреждения (пропущенные строки, неизвестные форматы дат и т.д.) */
  warnings: string[];
}
