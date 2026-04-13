'use client';

import { useState } from 'react';
import { Plus, Upload, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGanttScheduleView, type GanttScheduleTab, type NewTaskForm } from './useGanttScheduleView';
import type { GroupByField } from './GanttGroupingMenu';
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
import { GanttVersionEditDialog } from './GanttVersionEditDialog';
import { GanttChangeLogDialog } from './GanttChangeLogDialog';
import { GanttImportDialog } from './GanttImportDialog';
import { ImportFromEstimateDialog } from './ImportFromEstimateDialog';
import { useGanttExport, type ImportFormat } from './useGanttImport';

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

  // Диалог «Заполнить из другой версии» — простой пикер
  const [fillSourceId, setFillSourceId] = useState<string>('');

  // Состояние тулбара ГПР (разделено на уровне Schedule чтобы toolbar знал об активных режимах)
  const [groupBy, setGroupBy] = useState<GroupByField | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isIsolated, setIsIsolated] = useState(false);
  const [changeLogOpen, setChangeLogOpen] = useState(false);

  // Импорт / Экспорт
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat>('EXCEL');
  const [estimateDialogOpen, setEstimateDialogOpen] = useState(false);
  const { downloadExport } = useGanttExport(objectId, vid);

  const taskCount = view.selectedVersion?.taskCount ?? 0;
  const isEmptyVersion = !!vid && taskCount === 0;

  function openImport(format: ImportFormat) {
    setImportFormat(format);
    setImportDialogOpen(true);
  }

  function handleConfirmFillFromVersion() {
    if (!fillSourceId) return;
    view.handleFillFromVersion(fillSourceId);
  }

  return (
    <div className="space-y-2">
      {/* Строка: название версии + Badge статуса + кнопка редактировать */}
      <GanttScheduleHeader
        version={view.selectedVersion}
        onEditVersion={() => view.setEditVersionOpen(true)}
      />

      {/* Тулбар: иконки + кнопка «Действия» с вложенным меню */}
      <GanttScheduleToolbar
        versionId={vid}
        onEditVersion={() => view.setEditVersionOpen(true)}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        isMultiSelectActive={isMultiSelectMode}
        onToggleMultiSelect={() => {
          setIsMultiSelectMode((v) => !v);
          if (isIsolated) setIsIsolated(false);
        }}
        isIsolated={isIsolated}
        onIsolate={() => setIsIsolated(true)}
        onShowAll={() => setIsIsolated(false)}
        onOpenChangeLog={() => setChangeLogOpen(true)}
        onImport={openImport}
        onExportExcel={() => downloadExport('excel')}
        onExportExcelDeps={() => downloadExport('excel_deps')}
        onExportPdf={() => downloadExport('pdf')}
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
          onCreateVersion={() => view.setCreateVersionOpen(true)}
          onFillFromDirective={view.handleFillFromDirective}
          onFillFromVersion={() => { setFillSourceId(''); view.setFillFromVersionOpen(true); }}
          onOpenVersionSettings={() => view.setEditVersionOpen(true)}
          fillFromVersionPending={view.fillFromVersionPending}
        />

        <div className="flex-1 min-w-0">
          {!vid ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground text-sm">Выберите версию ГПР</p>
            </div>
          ) : isEmptyVersion ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
              <p className="text-muted-foreground text-sm">Версия пуста. Добавьте данные:</p>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" onClick={() => view.setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить запись ГПР
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4 mr-1" />
                      Импортировать ГПР
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => openImport('EXCEL')}>MS Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openImport('PRIMAVERA')}>Primavera P6</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openImport('MS_PROJECT')}>MS Project</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openImport('SPIDER')}>Spider Project</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" variant="outline" onClick={() => setEstimateDialogOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Заполнить из смет
                </Button>
              </div>
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
                <GanttCoordinationView
                  objectId={objectId}
                  versionId={vid}
                  groupBy={groupBy}
                  isMultiSelectMode={isMultiSelectMode}
                  onMultiSelectModeChange={setIsMultiSelectMode}
                  isIsolated={isIsolated}
                  onIsolationChange={setIsIsolated}
                />
              </TabsContent>
              <TabsContent value="gantt">
                <GanttChartGPR objectId={objectId} versionId={vid} version={view.selectedVersion} />
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

      {/* Диалог создания новой версии ГПР */}
      <GanttVersionEditDialog
        open={view.createVersionOpen}
        onOpenChange={view.setCreateVersionOpen}
        objectId={objectId}
        version={null}
        defaultStageId={view.selectedStageId}
      />

      {/* Диалог редактирования существующей версии ГПР */}
      <GanttVersionEditDialog
        open={view.editVersionOpen}
        onOpenChange={view.setEditVersionOpen}
        objectId={objectId}
        version={view.selectedVersion}
        defaultStageId={view.selectedStageId}
      />

      {/* Диалог «История изменений» */}
      {vid && (
        <GanttChangeLogDialog
          open={changeLogOpen}
          onOpenChange={setChangeLogOpen}
          objectId={objectId}
          versionId={vid}
        />
      )}

      {/* Диалог «Заполнить из другой версии» */}
      <Dialog open={view.fillFromVersionOpen} onOpenChange={view.setFillFromVersionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Заполнить из другой версии</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Исходная версия</Label>
            <Select value={fillSourceId} onValueChange={setFillSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите версию-источник" />
              </SelectTrigger>
              <SelectContent>
                {view.versions
                  .filter((v) => v.id !== vid)
                  .map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.stage?.name ? `[${v.stage.name}] ` : ''}{v.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Задачи текущей версии будут заменены задачами из выбранной.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => view.setFillFromVersionOpen(false)}>Отмена</Button>
            <Button
              disabled={!fillSourceId || view.fillFromVersionPending}
              onClick={handleConfirmFillFromVersion}
            >
              Заполнить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог импорта файла ГПР */}
      {vid && (
        <GanttImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          objectId={objectId}
          versionId={vid}
          format={importFormat}
          hasExistingTasks={taskCount > 0}
        />
      )}

      {/* Диалог импорта из сметы (для empty-state кнопки) */}
      {estimateDialogOpen && vid && (
        <ImportFromEstimateDialog
          objectId={objectId}
          versionId={vid}
          onClose={() => setEstimateDialogOpen(false)}
        />
      )}
    </div>
  );
}
