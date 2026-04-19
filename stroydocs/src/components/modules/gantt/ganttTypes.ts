// Типы и базовый URL для модуля Ганта

export interface GanttVersionItem {
  id: string;
  name: string;
  isBaseline: boolean;
  isActive: boolean;
  contractId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { firstName: string; lastName: string };
  _count: { tasks: number };
}

export interface GanttExecDocRef {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
}

export interface GanttTaskItem {
  id: string;
  name: string;
  sortOrder: number;
  level: number;
  status: string;
  planStart: string;
  planEnd: string;
  factStart: string | null;
  factEnd: string | null;
  progress: number;
  isCritical: boolean;
  isMilestone: boolean;
  linkedExecutionDocsCount: number;
  versionId: string;
  parentId: string | null;
  workItemId: string | null;
  contractId: string | null;
  workItem: { id: string; name: string; projectCipher: string } | null;
  // Расширенные поля задачи ГПР
  volume: number | null;
  volumeUnit: string | null;
  amount: number | null;
  amountVat: number | null;
  weight: number;
  manHours: number | null;
  machineHours: number | null;
  deadline: string | null;
  comment: string | null;
  costType: string | null;
  workType: string | null;
  basis: string | null;
  materialDistribution: string;
  calcType: string | null;
  taskContractId: string | null;
  estimateItemId: string | null;
  attachmentS3Keys: string[];
  calendarType: string | null;
}

export interface GanttDependencyItem {
  id: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
  predecessorId: string;
  successorId: string;
  predecessor?: { id: string; name: string };
  successor?: { id: string; name: string };
}

export interface GanttTasksData {
  tasks: GanttTaskItem[];
  dependencies: GanttDependencyItem[];
}

export function ganttBase(projectId: string, contractId: string) {
  return `/api/projects/${projectId}/contracts/${contractId}/gantt`;
}
