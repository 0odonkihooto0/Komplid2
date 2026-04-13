'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  useGanttStages,
  useGanttVersionsByProject,
  type GanttStageItem,
  type GanttVersionSummary,
} from './useGanttStructure';
import { useCreateTaskGPR, useAutoFillFromWorkItems } from './useGanttScheduleHooks';

// Вкладки внутри страницы «График»
export type GanttScheduleTab =
  | 'coordination'
  | 'gantt'
  | 'planfact'
  | 'closure'
  | 'id-sk'
  | 'delegation';

export interface NewTaskForm {
  name: string;
  planStart: string;
  planEnd: string;
}

export interface UseGanttScheduleViewResult {
  // Данные
  stages: GanttStageItem[];
  versions: GanttVersionSummary[];
  stagesLoading: boolean;
  versionsLoading: boolean;
  selectedVersion: GanttVersionSummary | null;
  // Выбор стадии / версии
  selectedStageId: string | null;
  selectedVersionId: string | null;
  setSelectedStageId: (id: string | null) => void;
  setSelectedVersionId: (id: string | null) => void;
  // Активная под-вкладка
  activeTab: GanttScheduleTab;
  setActiveTab: (tab: GanttScheduleTab) => void;
  // Диалог создания задачи
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  form: NewTaskForm;
  setForm: Dispatch<SetStateAction<NewTaskForm>>;
  handleCreateTask: () => void;
  createTaskPending: boolean;
  // Автозаполнение из видов работ
  handleAutoFill: () => void;
  autoFillPending: boolean;
}

export function useGanttScheduleView(objectId: string): UseGanttScheduleViewResult {
  const [selectedStageId, setSelectedStageIdState] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionIdState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GanttScheduleTab>('coordination');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewTaskForm>({
    name: '',
    planStart: new Date().toISOString().slice(0, 10),
    planEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const { stages, isLoading: stagesLoading } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(
    objectId,
    selectedStageId,
  );

  const createTask = useCreateTaskGPR(objectId, selectedVersionId ?? '');
  const autoFill = useAutoFillFromWorkItems(objectId, selectedVersionId ?? '');

  // Сбрасываем версию при смене стадии
  function setSelectedStageId(id: string | null) {
    setSelectedStageIdState(id);
    setSelectedVersionIdState(null);
  }

  function setSelectedVersionId(id: string | null) {
    setSelectedVersionIdState(id);
  }

  const selectedVersion: GanttVersionSummary | null =
    versions.find((v: GanttVersionSummary) => v.id === selectedVersionId) ?? null;

  function handleCreateTask() {
    if (!selectedVersionId || !form.name.trim()) return;
    createTask.mutate(
      {
        name: form.name.trim(),
        planStart: new Date(form.planStart).toISOString(),
        planEnd: new Date(form.planEnd).toISOString(),
        level: 0,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  function handleAutoFill() {
    autoFill.mutate();
  }

  return {
    stages,
    versions,
    stagesLoading,
    versionsLoading,
    selectedVersion,
    selectedStageId,
    selectedVersionId,
    setSelectedStageId,
    setSelectedVersionId,
    activeTab,
    setActiveTab,
    createOpen,
    setCreateOpen,
    form,
    setForm,
    handleCreateTask,
    createTaskPending: createTask.isPending,
    handleAutoFill,
    autoFillPending: autoFill.isPending,
  };
}
