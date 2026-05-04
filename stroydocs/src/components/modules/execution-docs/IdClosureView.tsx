'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, Download, Trash2, FileArchive, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/shared/EmptyState';
import { useClosurePackages, useDeletePackage, useGeneratePackage } from './useIdClosure';
import { ClosureWizard } from './ClosureWizard';
import type { AiComplianceCheck } from '@prisma/client';

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
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { packages, isLoading } = useClosurePackages(objectId);
  const deletePackage = useDeletePackage(objectId);
  const generatePackage = useGeneratePackage(objectId);

  // Последняя AI-проверка — определяем, есть ли критичные нарушения
  const { data: checksData } = useQuery<{ data: AiComplianceCheck[] }>({
    queryKey: ['compliance-checks-list', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/compliance-checks`);
      return res.json();
    },
  });
  const lastCheck = checksData?.data?.[0];
  const hasCriticalIssues =
    lastCheck?.status === 'COMPLETED' &&
    lastCheck.issueCount > 0 &&
    (lastCheck.summary?.includes('критичных') ?? false);

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
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/objects/${objectId}/id/compliance`)}
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            AI-проверка
          </Button>
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
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/objects/${objectId}/id/compliance`)}
        >
          <ShieldCheck className="h-4 w-4 mr-1" />
          AI-проверка
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={() => setWizardOpen(true)}
                  disabled={hasCriticalIssues}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Создать пакет
                </Button>
              </span>
            </TooltipTrigger>
            {hasCriticalIssues && (
              <TooltipContent>
                <p>Исправьте критичные ошибки перед созданием пакета</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
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
