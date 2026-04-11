'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplates, useApplyTemplate } from './useApprovalTemplates';
import { CreateApprovalTemplateDialog } from './CreateApprovalTemplateDialog';
import type { PIREntityType } from './types';

interface Props {
  entityType: PIREntityType;
  entityId: string;
  objectId: string;
  isTerminalStatus: boolean;
  queryKey: unknown[];
}

export function ApprovalTemplateSelector({
  entityType, entityId, isTerminalStatus, queryKey,
}: Props) {
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId ?? '';
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: templates = [], isLoading } = useTemplates(orgId, entityType);

  const applyMutation = useApplyTemplate(queryKey, () => setSelectorOpen(false));

  if (isTerminalStatus) {
    return (
      <p className="text-sm text-muted-foreground">
        Согласование завершено или документ аннулирован.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Маршрут согласования не запущен. Выберите шаблон или создайте новый.
        </p>
        <Button size="sm" onClick={() => setSelectorOpen(true)} disabled={!orgId}>
          <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />
          Отправить на согласование
        </Button>
      </div>

      {/* Диалог выбора шаблона */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Выберите шаблон согласования</DialogTitle>
            <DialogDescription>
              Шаблон определяет участников и порядок согласования документа.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {isLoading && (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            )}

            {!isLoading && templates.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Шаблонов нет. Создайте первый шаблон.
              </p>
            )}

            {!isLoading && templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tpl.levels.length} {tpl.levels.length === 1 ? 'уровень' : 'уровней'} согласования
                  </p>
                  {tpl.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{tpl.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="ml-3 flex-shrink-0"
                  onClick={() =>
                    applyMutation.mutate({ orgId, templateId: tpl.id, entityType, entityId })
                  }
                  disabled={applyMutation.isPending}
                >
                  Применить
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setSelectorOpen(false); setCreateOpen(true); }}
            >
              + Создать шаблон
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог создания шаблона */}
      <CreateApprovalTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        entityType={entityType}
        entityId={entityId}
        organizationId={orgId}
        queryKey={queryKey}
        onApplied={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); setSelectorOpen(true); }}
      />
    </>
  );
}
