'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PassportView } from '@/components/objects/passport/PassportView';
import { IndicatorsView } from '@/components/objects/indicators/IndicatorsView';
import { FundingView } from '@/components/objects/funding/FundingView';
import { ContractsList } from '@/components/objects/contracts/ContractsList';
import { SkDefectsView } from '@/components/modules/objects/sk/SkDefectsView';
import { ProblemsView } from '@/components/objects/passport/ProblemsView';
import { TasksView } from '@/components/objects/tasks/TasksView';
import { PhotosContent } from '@/components/objects/photos/PhotosContent';

interface Props {
  objectId: string | null;
  onClose: () => void;
}

const TABS = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'indicators', label: 'Показатели' },
  { value: 'funding', label: 'Финансирование' },
  { value: 'contracts', label: 'Контракты' },
  { value: 'sk', label: 'Стройконтроль' },
  { value: 'issues', label: 'Проблемные вопросы' },
  { value: 'tasks', label: 'Задачи' },
  { value: 'photos', label: 'Фотогалерея' },
] as const;

export function ObjectPassportDialog({ objectId, onClose }: Props) {
  return (
    <Dialog open={objectId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Паспорт объекта</DialogTitle>
        </DialogHeader>

        {objectId && (
          <Tabs defaultValue="passport" className="flex-1 overflow-hidden flex flex-col min-h-0">
            <TabsList className="w-full rounded-none border-b bg-transparent h-9 px-4 justify-start gap-0.5 shrink-0 overflow-x-auto flex-nowrap">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs h-8 px-3 shrink-0"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="passport" className="mt-0 p-4">
                <PassportView projectId={objectId} />
              </TabsContent>

              <TabsContent value="indicators" className="mt-0 p-4">
                <IndicatorsView projectId={objectId} />
              </TabsContent>

              <TabsContent value="funding" className="mt-0 p-4">
                <FundingView projectId={objectId} />
              </TabsContent>

              <TabsContent value="contracts" className="mt-0 p-4">
                <ContractsList objectId={objectId} />
              </TabsContent>

              <TabsContent value="sk" className="mt-0 p-4">
                <SkDefectsView objectId={objectId} />
              </TabsContent>

              <TabsContent value="issues" className="mt-0 p-4">
                <ProblemsView projectId={objectId} />
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 p-4">
                <TasksView projectId={objectId} />
              </TabsContent>

              <TabsContent value="photos" className="mt-0 p-4">
                <PhotosContent objectId={objectId} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
