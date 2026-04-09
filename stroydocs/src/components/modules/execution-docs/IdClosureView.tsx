'use client';

import { useState } from 'react';
import { Package, Plus, Download, Trash2, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useClosurePackages, useDeletePackage, useGeneratePackage } from './useIdClosure';
import { ClosureWizard } from './ClosureWizard';

interface Props {
  objectId: string;
}

// Цвет бейджа статуса пакета
const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  DRAFT: { label: 'Черновик', variant: 'secondary' },
  ASSEMBLED: { label: 'Сформирован', variant: 'default' },
  EXPORTED: { label: 'Экспортирован', variant: 'outline' },
  ACCEPTED: { label: 'Принят', variant: 'default' },
};

/** Закрывающий пакет ИД — финальная сборка документации для сдачи объекта */
export function IdClosureView({ objectId }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { packages, isLoading } = useClosurePackages(objectId);
  const deletePackage = useDeletePackage(objectId);
  const generatePackage = useGeneratePackage(objectId);

  if (wizardOpen) {
    return <ClosureWizard objectId={objectId} onClose={() => setWizardOpen(false)} />;
  }

  if (!isLoading && packages.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Закрывающие пакеты"
          description="Сформируйте финальный пакет ИД для сдачи объекта. Включает все подписанные акты, реестры и архивные документы."
        />
        <div className="flex justify-center">
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Создать пакет
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Создать пакет
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Загрузка...</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Номер</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Название</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Статус</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Документов</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Автор</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const totalDocs = pkg.executionDocIds.length + pkg.registryIds.length + pkg.archiveDocIds.length;
                const statusInfo = STATUS_MAP[pkg.status] ?? { label: pkg.status, variant: 'outline' as const };
                const authorName = [pkg.createdBy.lastName, pkg.createdBy.firstName].filter(Boolean).join(' ');

                return (
                  <tr key={pkg.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{pkg.number}</td>
                    <td className="px-3 py-2">{pkg.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{totalDocs}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{authorName}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {/* Генерация ZIP (только для DRAFT или повторная) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generatePackage.mutate(pkg.id)}
                          disabled={generatePackage.isPending || totalDocs === 0}
                          title="Сформировать ZIP"
                        >
                          <FileArchive className="h-4 w-4" />
                        </Button>

                        {/* Скачать (если уже сформирован) */}
                        {pkg.s3Key && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generatePackage.mutate(pkg.id)}
                            title="Скачать ZIP"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Удалить (только DRAFT) */}
                        {pkg.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePackage.mutate(pkg.id)}
                            disabled={deletePackage.isPending}
                            title="Удалить пакет"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
