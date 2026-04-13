'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GanttTaskItem } from '@/components/modules/gantt/ganttTypes';
import { useUpdateTaskGPR } from './useGanttScheduleHooks';
import { useGanttTaskEdit } from './useGanttTaskEdit';
import { GanttTaskMainTab } from './GanttTaskMainTab';
import { GanttTaskExtraTab } from './GanttTaskExtraTab';

export const editTaskSchema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(500),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD']),
  planStart: z.string().min(1),
  planEnd: z.string().min(1),
  factStart: z.string().optional(),
  factEnd: z.string().optional(),
  progress: z.number().min(0).max(100),
  isCritical: z.boolean(),
  isMilestone: z.boolean(),
  parentId: z.string().nullable(),
  taskContractId: z.string().nullable(),
  volume: z.number().nullable(),
  volumeUnit: z.string().nullable(),
  amount: z.number().nullable(),
  amountVat: z.number().nullable(),
  weight: z.number().min(0),
  manHours: z.number().nullable(),
  machineHours: z.number().nullable(),
  deadline: z.string().optional(),
  comment: z.string().max(2000).nullable(),
  workType: z.string().max(200).nullable(),
  costType: z.enum(['CONSTRUCTION', 'MOUNTING', 'EQUIPMENT', 'OTHER']).nullable(),
  basis: z.string().max(500).nullable(),
  materialDistribution: z.enum(['UNIFORM', 'PER_UNIT', 'FIRST_DAY', 'LAST_DAY']),
  calcType: z.enum(['DEFAULT', 'VOLUME', 'AMOUNT', 'MAN_HOURS', 'MACHINE_HOURS', 'LABOR']).nullable(),
});

export type EditTaskFormData = z.infer<typeof editTaskSchema>;

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: GanttTaskItem;
  objectId: string;
  versionId: string;
  allTasks: GanttTaskItem[];
  defaultTab?: 'main' | 'extra';
}

export function GanttTaskEditDialog({
  open,
  onOpenChange,
  task,
  objectId,
  versionId,
  allTasks,
  defaultTab = 'main',
}: Props) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const updateTask = useUpdateTaskGPR(objectId, versionId);
  const { contracts, contractsLoading, parentOptions, uploadAttachment, removeAttachment } =
    useGanttTaskEdit(objectId, versionId, task.id, allTasks);

  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      name: task.name,
      status: task.status as EditTaskFormData['status'],
      planStart: toDateInput(task.planStart),
      planEnd: toDateInput(task.planEnd),
      factStart: toDateInput(task.factStart),
      factEnd: toDateInput(task.factEnd),
      progress: task.progress,
      isCritical: task.isCritical,
      isMilestone: task.isMilestone,
      parentId: task.parentId,
      taskContractId: task.taskContractId,
      volume: task.volume,
      volumeUnit: task.volumeUnit,
      amount: task.amount,
      amountVat: task.amountVat,
      weight: task.weight,
      manHours: task.manHours,
      machineHours: task.machineHours,
      deadline: toDateInput(task.deadline),
      comment: task.comment,
      workType: task.workType,
      costType: (task.costType as EditTaskFormData['costType']) ?? null,
      basis: task.basis,
      materialDistribution: (task.materialDistribution as EditTaskFormData['materialDistribution']) ?? 'UNIFORM',
      calcType: (task.calcType as EditTaskFormData['calcType']) ?? null,
    },
  });

  function onSubmit(data: EditTaskFormData) {
    updateTask.mutate(
      {
        taskId: task.id,
        data: {
          name: data.name,
          status: data.status,
          planStart: data.planStart ? new Date(data.planStart).toISOString() : undefined,
          planEnd: data.planEnd ? new Date(data.planEnd).toISOString() : undefined,
          factStart: data.factStart ? new Date(data.factStart).toISOString() : null,
          factEnd: data.factEnd ? new Date(data.factEnd).toISOString() : null,
          progress: data.progress,
          isCritical: data.isCritical,
          isMilestone: data.isMilestone,
          parentId: data.parentId,
          taskContractId: data.taskContractId,
          volume: data.volume,
          volumeUnit: data.volumeUnit,
          amount: data.amount,
          amountVat: data.amountVat,
          weight: data.weight,
          manHours: data.manHours,
          machineHours: data.machineHours,
          deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
          comment: data.comment,
          workType: data.workType,
          costType: data.costType,
          basis: data.basis,
          materialDistribution: data.materialDistribution,
          calcType: data.calcType,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            Редактирование задачи
            {task.estimateItemId && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                №{task.estimateItemId}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="main">Основные</TabsTrigger>
              <TabsTrigger value="extra">Дополнительно</TabsTrigger>
            </TabsList>

            <TabsContent value="main">
              <GanttTaskMainTab
                form={form}
                contracts={contracts}
                contractsLoading={contractsLoading}
                parentOptions={parentOptions}
                taskId={task.id}
              />
            </TabsContent>

            <TabsContent value="extra">
              <GanttTaskExtraTab
                form={form}
                task={task}
                objectId={objectId}
                versionId={versionId}
                uploadAttachment={uploadAttachment}
                removeAttachment={removeAttachment}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" size="sm" disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
