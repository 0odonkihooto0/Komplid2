'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaskDetail } from './useTaskDetail';
import { TaskDetailHeader } from './TaskDetailHeader';
import { TaskDetailSidebar } from './TaskDetailSidebar';
import { TaskChecklistTab } from './TaskChecklistTab';
import { TaskReportsTab } from './TaskReportsTab';
import { TaskChildrenTab } from './TaskChildrenTab';
import { TaskDiscussionTab } from './TaskDiscussionTab';
import { TaskHistoryTab } from './TaskHistoryTab';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { CreateTaskDialogFull } from './CreateTaskDialogFull';

interface PendingAction {
  action: string;
  payload?: Record<string, unknown>;
  requireReason?: boolean;
  requireUser?: boolean;
  title: string;
  description: string;
}

interface Props {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailDialog({ taskId, onClose }: Props) {
  const {
    task, isLoading, comments, currentUserRole,
    updateTask, doAction, toggleChecklistItem,
    addChecklistItem, deleteChecklistItem, reorderChecklist,
    addReport, addComment, createPublicLink,
  } = useTaskDetail(taskId);

  const [confirmPending, setConfirmPending] = useState<PendingAction | null>(null);
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false);

  function handleAction(action: string, payload?: Record<string, unknown>) {
    const actionsNeedingReason = ['return-to-revision', 'discuss'];
    const actionsNeedingUser = ['delegate', 'redirect'];

    if (actionsNeedingReason.includes(action)) {
      setConfirmPending({
        action, payload,
        requireReason: true,
        title: action === 'return-to-revision' ? 'Вернуть на доработку' : 'Обсудить',
        description: 'Укажите причину или комментарий',
      });
      return;
    }
    if (actionsNeedingUser.includes(action)) {
      setConfirmPending({
        action, payload,
        requireUser: true,
        title: action === 'delegate' ? 'Делегировать' : 'Перенаправить',
        description: 'Выберите пользователя',
      });
      return;
    }
    doAction.mutate({ action, ...payload });
  }

  function handleConfirm(reason?: string, userId?: string) {
    if (!confirmPending) return;
    doAction.mutate({
      action: confirmPending.action,
      ...confirmPending.payload,
      ...(reason ? { comment: reason } : {}),
      ...(userId ? { userId } : {}),
    });
    setConfirmPending(null);
  }

  function handleCopyLink() {
    if (task?.publicLinkToken) {
      const url = `${window.location.origin}/tasks/public/${task.publicLinkToken}`;
      void navigator.clipboard.writeText(url);
    } else {
      createPublicLink.mutate();
    }
  }

  return (
    <>
      <Sheet open={!!taskId} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="right" className="flex w-[90vw] max-w-5xl flex-col p-0 sm:max-w-5xl">
          {isLoading || !task ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <TaskDetailHeader
                task={task}
                currentUserRole={currentUserRole}
                onUpdate={(data) => updateTask.mutate(data)}
                onAction={handleAction}
                onClose={onClose}
                onCopyLink={handleCopyLink}
                onCreateSubtask={() => setCreateSubtaskOpen(true)}
              />

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <Tabs defaultValue="description" className="flex min-h-0 flex-1 flex-col">
                    <TabsList className="shrink-0 justify-start rounded-none border-b bg-transparent px-6">
                      <TabsTrigger value="description" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">Описание</TabsTrigger>
                      <TabsTrigger value="checklist" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                        Чек-лист {task._count.checklist > 0 && `(${task._count.checklist})`}
                      </TabsTrigger>
                      <TabsTrigger value="reports" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                        Отчёты {task._count.reports > 0 && `(${task._count.reports})`}
                      </TabsTrigger>
                      <TabsTrigger value="children" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                        Подчинённые {task._count.childTasks > 0 && `(${task._count.childTasks})`}
                      </TabsTrigger>
                      <TabsTrigger value="discussion" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">Обсуждение</TabsTrigger>
                      <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">История</TabsTrigger>
                    </TabsList>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <TabsContent value="description" className="mt-0 p-6">
                        {task.description
                          ? <p className="whitespace-pre-wrap text-sm text-gray-700">{task.description}</p>
                          : <p className="text-sm text-gray-400">Описание не задано</p>}
                      </TabsContent>

                      <TabsContent value="checklist" className="mt-0">
                        <TaskChecklistTab
                          items={task.checklist}
                          currentUserRole={currentUserRole}
                          onToggle={(itemId, done) => toggleChecklistItem.mutate({ itemId, done })}
                          onAdd={(title) => addChecklistItem.mutate({ title })}
                          onDelete={(itemId) => deleteChecklistItem.mutate(itemId)}
                          onReorder={(items) => reorderChecklist.mutate(items)}
                        />
                      </TabsContent>

                      <TabsContent value="reports" className="mt-0">
                        <TaskReportsTab
                          reports={task.reports}
                          currentUserRole={currentUserRole}
                          taskStatus={task.status}
                          onAddReport={(data) => addReport.mutate(data)}
                        />
                      </TabsContent>

                      <TabsContent value="children" className="mt-0">
                        <TaskChildrenTab
                          childTasks={task.childTasks}
                          parentTaskId={task.id}
                          onOpenTask={(_id) => {}}
                          onCreateSubtask={() => setCreateSubtaskOpen(true)}
                        />
                      </TabsContent>

                      <TabsContent value="discussion" className="mt-0 h-full">
                        <TaskDiscussionTab
                          comments={comments}
                          onAddComment={(text) => addComment.mutate(text)}
                        />
                      </TabsContent>

                      <TabsContent value="history" className="mt-0">
                        <TaskHistoryTab
                          reports={task.reports}
                          task={task}
                        />
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>

                <TaskDetailSidebar
                  task={task}
                  currentUserRole={currentUserRole}
                  onUpdate={(data) => updateTask.mutate(data)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {confirmPending && (
        <ConfirmActionDialog
          open={!!confirmPending}
          onOpenChange={(open) => { if (!open) setConfirmPending(null); }}
          title={confirmPending.title}
          description={confirmPending.description}
          requireReason={confirmPending.requireReason}
          requireUser={confirmPending.requireUser}
          onConfirm={handleConfirm}
        />
      )}

      {createSubtaskOpen && (
        <CreateTaskDialogFull
          open={createSubtaskOpen}
          onOpenChange={setCreateSubtaskOpen}
          presetParentTaskId={taskId ?? undefined}
        />
      )}
    </>
  );
}
