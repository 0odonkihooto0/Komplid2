'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import { CLOSURE_STATUS_CONFIG } from '@/lib/pir/closure-state-machine';
import { usePIRClosureActs } from './usePIRClosureActs';
import { CreatePIRClosureSheet } from './CreatePIRClosureSheet';
import { PIRClosureActDetailSheet } from './PIRClosureActDetailSheet';

interface Props {
  objectId: string;
}

function RowSkeleton() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

export function PIRClosureActList({ objectId }: Props) {
  const { acts, isLoading } = usePIRClosureActs(objectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedActId, setSelectedActId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Акты закрытия ПИР</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Создать акт
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">№ акта</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Период</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Дата создания</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Автор</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Позиций</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Статус</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}

            {!isLoading && acts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Актов закрытия нет. Создайте первый.
                </td>
              </tr>
            )}

            {!isLoading &&
              acts.map((act) => {
                const statusCfg = CLOSURE_STATUS_CONFIG[act.status];
                return (
                  <tr
                    key={act.id}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0"
                    onClick={() => setSelectedActId(act.id)}
                  >
                    <td className="px-3 py-3 font-medium">{act.number}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(act.periodStart)} — {formatDate(act.periodEnd)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(act.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      {act.author.lastName} {act.author.firstName}
                    </td>
                    <td className="px-3 py-3 text-center">{act._count.items}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', statusCfg.dotClass)} />
                        <Badge className={cn('text-xs', statusCfg.badgeClass)}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Диалог создания акта */}
      <CreatePIRClosureSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={objectId}
      />

      {/* Детальная панель акта */}
      {selectedActId && (
        <PIRClosureActDetailSheet
          projectId={objectId}
          actId={selectedActId}
          onClose={() => setSelectedActId(null)}
        />
      )}
    </div>
  );
}
