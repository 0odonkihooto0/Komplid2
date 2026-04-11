'use client';

import { X, CheckCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/utils/format';
import { CLOSURE_STATUS_CONFIG } from '@/lib/pir/closure-state-machine';
import { cn } from '@/lib/utils';
import { PIRClosureItemsEditor } from './PIRClosureItemsEditor';
import { PIRApprovalWidget } from '@/components/modules/approval/PIRApprovalWidget';
import { usePIRClosureDetail } from './usePIRClosureDetail';

interface Props {
  projectId: string;
  actId: string;
  onClose: () => void;
}

export function PIRClosureActDetailSheet({ projectId, actId, onClose }: Props) {
  const {
    act,
    isLoading,
    conduct,
    isConducting,
    fillItems,
    isFilling,
  } = usePIRClosureDetail(projectId, actId);

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!act) return null;

  const statusCfg = CLOSURE_STATUS_CONFIG[act.status];
  const isDraft = act.status === 'DRAFT';
  const hasItems = act.items.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-xl">

        {/* Шапка */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Акт закрытия ПИР №{act.number}</h2>
              <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', statusCfg.dotClass)} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={cn(statusCfg.badgeClass)}>{statusCfg.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(act.periodStart)} — {formatDate(act.periodEnd)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Кнопка «Провести» — только в статусе DRAFT при наличии позиций */}
            {isDraft && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => conduct()}
                disabled={isConducting || !hasItems}
                aria-label="Провести акт"
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Провести
              </Button>
            )}
            {/* Печать — заглушка, будет реализована в Модуле 7 */}
            <Button size="sm" variant="ghost" disabled aria-label="Печать (скоро)">
              <Printer className="h-4 w-4" />
            </Button>
            <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100 ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <Separator />

        {/* Вкладки */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="items" className="flex h-full flex-col">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="items">
                Позиции
                {hasItems && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                    {act.items.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approval">Согласование</TabsTrigger>
            </TabsList>

            {/* Вкладка «Позиции» */}
            <TabsContent value="items" className="flex-1 px-6 pb-6 pt-4">
              {isDraft && !hasItems && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Добавьте позиции и нажмите «Сохранить позиции», затем «Провести».
                </p>
              )}
              <PIRClosureItemsEditor
                items={act.items}
                isReadonly={!isDraft}
                onSave={fillItems}
                isSaving={isFilling}
              />
            </TabsContent>

            {/* Вкладка «Согласование» */}
            <TabsContent value="approval" className="px-6 pb-6 pt-4">
              <PIRApprovalWidget
                entityType="PIR_CLOSURE"
                entityId={actId}
                objectId={projectId}
                approvalRoute={act.approvalRoute}
                entityStatus={act.status}
                isTerminalStatus={act.status === 'SIGNED'}
                canStartApproval={act.status === 'CONDUCTED'}
                queryKey={['pir-closure-act', actId]}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
