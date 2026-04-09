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
  linkedExecutionDocsCount: number;
  versionId: string;
  parentId: string | null;
  workItemId: string | null;
  contractId: string | null;
  workItem: { id: string; name: string; projectCipher: string } | null;
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
  return `/api/objects/${projectId}/contracts/${contractId}/gantt`;
}
