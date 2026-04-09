'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePIRRegistries } from './usePIRRegistries';
import { CreatePIRRegistryDialog } from './CreatePIRRegistryDialog';
import type { ExpertiseStatus } from '@prisma/client';

interface Props {
  objectId: string;
}

const EXPERTISE_BADGE: Record<ExpertiseStatus, { label: string; cls: string }> = {
  NOT_SUBMITTED:     { label: 'Не подано',              cls: 'bg-gray-100 text-gray-700' },
  IN_PROCESS:        { label: 'На экспертизе',          cls: 'bg-blue-100 text-blue-700' },
  APPROVED_POSITIVE: { label: 'Положительное',          cls: 'bg-green-100 text-green-700' },
  APPROVED_NEGATIVE: { label: 'Отрицательное',          cls: 'bg-red-100 text-red-700' },
  REVISION_REQUIRED: { label: 'На доработку',           cls: 'bg-orange-100 text-orange-700' },
};

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

export function PIRRegistryList({ objectId }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { registries, isLoading } = usePIRRegistries(objectId);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Реестры передачи документации</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить реестр
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">№ реестра</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Дата</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Отправитель</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Получатель</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Экспертиза</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Документов</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}

            {!isLoading && registries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Нет реестров. Создайте первый.
                </td>
              </tr>
            )}

            {!isLoading &&
              registries.map((reg) => {
                const expertise = reg.expertiseStatus
                  ? EXPERTISE_BADGE[reg.expertiseStatus]
                  : null;
                return (
                  <tr
                    key={reg.id}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0"
                    onClick={() =>
                      router.push(`/objects/${objectId}/pir/registries/${reg.id}`)
                    }
                  >
                    <td className="px-3 py-3 font-medium">{reg.number}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(reg.createdAt)}</td>
                    <td className="px-3 py-3">{reg.senderOrg?.name ?? '—'}</td>
                    <td className="px-3 py-3">{reg.receiverOrg?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      {expertise ? (
                        <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', expertise.cls)}>
                          {expertise.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">{reg._count.items}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <CreatePIRRegistryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={objectId}
      />
    </div>
  );
}
