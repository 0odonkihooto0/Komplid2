'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import { useEstimateImports } from './useEstimateImports';
import { ImportStatusBadge } from './EstimateStatusBadge';
import { ESTIMATE_FORMAT_LABELS } from '@/utils/constants';
import type { EstimateFormat, EstimateImportStatus } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  projectId: string;
  contractId: string;
}

export function EstimateImportHistory({ projectId, contractId }: Props) {
  const router = useRouter();
  const { imports, isLoading, deleteMutation } = useEstimateImports(projectId, contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (imports.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">История импортов</h4>
      <div className="space-y-2">
        {imports.map((imp) => (
          <div
            key={imp.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{imp.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {imp.format ? ESTIMATE_FORMAT_LABELS[imp.format as EstimateFormat] : '—'}
                  {' · '}
                  {new Date(imp.createdAt).toLocaleDateString('ru-RU')}
                  {' · '}
                  {imp.createdBy.lastName} {imp.createdBy.firstName}
                  {imp.itemsTotal > 0 && (
                    <>
                      {' · '}
                      Позиций: {imp.itemsTotal} (привязано: {imp.itemsMapped})
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportStatusBadge status={imp.status as EstimateImportStatus} />
              {(imp.status === 'PREVIEW' || imp.status === 'CONFIRMED') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/objects/${projectId}/contracts/${contractId}/estimates/${imp.id}`
                    )
                  }
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {imp.status !== 'CONFIRMED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(imp.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
