'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAosrRegistry } from './useAosrRegistry';
import { AosrProjectContext } from './AosrProjectContext';
import { AosrRegistryRowItem } from './AosrRegistryRow';

interface Props {
  projectId: string;
  contractId: string;
}

const COL_HEADERS = [
  { label: '№', width: 'w-16' },
  { label: 'Выполненные работы', width: 'min-w-[180px]' },
  { label: 'Схема', width: 'min-w-[140px]' },
  { label: 'Разрешаются работы', width: 'min-w-[160px]' },
  { label: 'Материал', width: 'min-w-[180px]' },
  { label: 'Сертификат', width: 'min-w-[160px]' },
  { label: 'Статус', width: 'w-28' },
  { label: '', width: 'w-10' },
];

export function AosrRegistryTable({ projectId, contractId }: Props) {
  const { rows, projectContext, isLoading, updateCell } = useAosrRegistry(projectId, contractId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projectContext && (
        <AosrProjectContext
          context={projectContext}
          projectId={projectId}
          contractId={contractId}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Нет актов АОСР"
          description="Создайте АОСР на вкладке «ИД», чтобы они появились в реестре"
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                {COL_HEADERS.map(({ label, width }) => (
                  <th
                    key={label}
                    className={`${width} px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AosrRegistryRowItem
                  key={row.id}
                  row={row}
                  projectId={projectId}
                  contractId={contractId}
                  onSave={updateCell}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
