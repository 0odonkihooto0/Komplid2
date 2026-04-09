'use client';

import { useState } from 'react';
import { GanttStageFilter } from './GanttStageFilter';
import { GanttVersionsTable } from './GanttVersionsTable';
import {
  useGanttStages,
  useGanttVersionsByProject,
  useCreateStage,
  useCreateVersion,
  useDeleteVersion,
  useCopyVersion,
  useSetDirective,
} from './useGanttStructure';

interface Props {
  objectId: string;
}

export function GanttStructureView({ objectId }: Props) {
  // objectId из URL /objects/[objectId]/gpr/ = projectId в API /api/projects/[projectId]/
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const { stages, isLoading: stagesLoading } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(
    objectId,
    selectedStageId
  );

  const createStageMutation = useCreateStage(objectId);
  const createVersionMutation = useCreateVersion(objectId);
  const deleteVersionMutation = useDeleteVersion(objectId);
  const copyVersionMutation = useCopyVersion(objectId);
  const setDirectiveMutation = useSetDirective(objectId);

  return (
    <div className="space-y-4">
      {/* Фильтр по стадиям */}
      <GanttStageFilter
        stages={stages}
        selectedStageId={selectedStageId}
        onSelect={setSelectedStageId}
        onAddStage={(name) => createStageMutation.mutate(name)}
        isCreating={createStageMutation.isPending || stagesLoading}
      />

      {/* Таблица версий ГПР */}
      <GanttVersionsTable
        versions={versions}
        stages={stages}
        objectId={objectId}
        isLoading={versionsLoading}
        onDelete={(id) => deleteVersionMutation.mutate(id)}
        onCopy={(id) => copyVersionMutation.mutate(id)}
        onSetDirective={(id) => setDirectiveMutation.mutate(id)}
        onCreate={(name, stageId) => createVersionMutation.mutate({ name, stageId })}
        isCreating={createVersionMutation.isPending}
        selectedStageId={selectedStageId}
      />
    </div>
  );
}
