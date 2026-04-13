'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGanttScheduleView, type GanttScheduleTab, type NewTaskForm } from './useGanttScheduleView';
import { GanttScheduleHeader } from './GanttScheduleHeader';
import { GanttScheduleSidebar } from './GanttScheduleSidebar';
import { GanttScheduleToolbar } from './GanttScheduleToolbar';
import { GanttCreateTaskDialog } from './GanttCreateTaskDialog';
import { GanttCoordinationView } from './GanttCoordinationView';
import { GanttChartGPR } from './GanttChartGPR';
import { GanttPlanFactView } from './GanttPlanFactView';
import { GanttClosureView } from './GanttClosureView';
import { GanttIdSkView } from './GanttIdSkView';
import { GanttDelegationView } from './GanttDelegationView';

// Метки под-вкладок страницы «График» (ЦУС: Координация, Диаграмма, План-факт, Закрытие, ИД и СК, Делегирование)
const SCHEDULE_TABS = [
  { value: 'coordination', label: 'Координация работ' },
  { value: 'gantt',        label: 'Диаграмма Ганта' },
  { value: 'planfact',     label: 'План-факт' },
  { value: 'closure',      label: 'Закрытие работ' },
  { value: 'id-sk',        label: 'ИД и СК' },
  { value: 'delegation',   label: 'Делегирование' },
] as const;

interface Props {
  objectId: string;
}

export function GanttScheduleView({ objectId }: Props) {
  const view = useGanttScheduleView(objectId);
  const vid = view.selectedVersionId;

  return (
    <div className="space-y-2">
      {/* Строка: название версии + Badge статуса + кнопка редактировать */}
      <GanttScheduleHeader
        version={view.selectedVersion}
        onEditVersion={() => {/* TODO: открыть диалог редактирования версии */}}
      />

      {/* Тулбар: иконки + кнопка «Действия» с вложенным меню */}
      <GanttScheduleToolbar
        versionId={vid}
        onEditVersion={() => {/* TODO: открыть диалог редактирования версии */}}
      />

      {/* Основная область: боковая панель (версии/стадии) + под-вкладки */}
      <div className="flex gap-4 pt-1">
        <GanttScheduleSidebar
          stages={view.stages}
          versions={view.versions}
          selectedStageId={view.selectedStageId}
          selectedVersionId={vid}
          stagesLoading={view.stagesLoading}
          versionsLoading={view.versionsLoading}
          onStageChange={view.setSelectedStageId}
          onVersionChange={view.setSelectedVersionId}
          onCreateVersion={() => view.setCreateOpen(true)}
        />

        <div className="flex-1 min-w-0">
          {!vid ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground text-sm">Выберите версию ГПР</p>
            </div>
          ) : (
            <Tabs
              value={view.activeTab}
              onValueChange={(v: string) => view.setActiveTab(v as GanttScheduleTab)}
            >
              <TabsList className="flex-wrap mb-3">
                {SCHEDULE_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="coordination">
                <GanttCoordinationView objectId={objectId} versionId={vid} />
              </TabsContent>
              <TabsContent value="gantt">
                <GanttChartGPR objectId={objectId} versionId={vid} />
              </TabsContent>
              <TabsContent value="planfact">
                <GanttPlanFactView objectId={objectId} versionId={vid} />
              </TabsContent>
              <TabsContent value="closure">
                <GanttClosureView objectId={objectId} versionId={vid} />
              </TabsContent>
              <TabsContent value="id-sk">
                <GanttIdSkView objectId={objectId} versionId={vid} />
              </TabsContent>
              <TabsContent value="delegation">
                <GanttDelegationView objectId={objectId} versionId={vid} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Диалог создания задачи */}
      <GanttCreateTaskDialog
        open={view.createOpen}
        onClose={() => view.setCreateOpen(false)}
        form={view.form}
        onFormChange={(field, value) => view.setForm((f: NewTaskForm) => ({ ...f, [field]: value }))}
        onSubmit={view.handleCreateTask}
        isPending={view.createTaskPending}
      />
    </div>
  );
}
