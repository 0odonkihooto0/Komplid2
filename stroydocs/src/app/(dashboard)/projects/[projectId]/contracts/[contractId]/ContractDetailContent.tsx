'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useContract } from '@/components/modules/contracts/useContract';
import { ContractKpiBar } from '@/components/modules/contracts/ContractKpiBar';
import { ContractSummaryBar } from '@/components/modules/contracts/ContractSummaryBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import { useContractDialogs } from './useContractDialogs';
import { ContractTabsList } from './ContractTabsList';
import { ContractTabsContent } from './ContractTabsContent';

interface Props {
  projectId: string;
  contractId: string;
}

export function ContractDetailContent({ projectId, contractId }: Props) {
  const { contract, isLoading } = useContract(projectId, contractId);
  const dialogs = useContractDialogs();
  const { activeTab, setActiveTab } = dialogs;
  const router = useRouter();
  const { toast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  /** Удалить договор со всеми связанными данными */
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      toast({ title: 'Договор удалён' });
      router.push(`/objects/${projectId}/passport`);
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract) {
    return <p className="text-muted-foreground">Договор не найден</p>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <Link
          href={`/objects/${projectId}/passport`}
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Назад к проекту
        </Link>
        <div className="flex items-center gap-3">
          <PageHeader title={`${contract.number} — ${contract.name}`} />
          <StatusBadge
            status={contract.status}
            label={CONTRACT_STATUS_LABELS[contract.status]}
          />
          <Badge variant="outline">
            {contract.type === 'MAIN' ? 'Основной' : 'Субдоговор'}
          </Badge>

          {/* Кнопка глобальных действий над договором */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Действия
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    dialogs.setActiveTab('financial-tables');
                    dialogs.setCreateFinancialTableOpen(true);
                  }}
                >
                  Создать таблицу финансирования
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    toast({
                      title: 'В разработке',
                      description: 'Экспорт в PDF будет доступен в следующей версии',
                    })
                  }
                >
                  Экспорт в PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Удалить контракт
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
          {contract.startDate && <span>Начало: {formatDate(contract.startDate)}</span>}
          {contract.endDate && <span>Окончание: {formatDate(contract.endDate)}</span>}
          {contract.parent && (
            <span>
              Родительский договор:{' '}
              <Link
                href={`/objects/${projectId}/contracts/${contract.parent.id}`}
                className="text-primary hover:underline"
              >
                {contract.parent.number}
              </Link>
            </span>
          )}
        </div>
      </div>

      <ContractKpiBar
        projectId={projectId}
        contractId={contractId}
        onTabChange={setActiveTab}
      />

      <ContractSummaryBar projectId={projectId} contractId={contractId} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ContractTabsList
          participantCount={contract.participants.length}
          subContractCount={contract.subContracts.length}
        />
        <ContractTabsContent
          projectId={projectId}
          contractId={contractId}
          contract={contract}
          {...dialogs}
        />
      </Tabs>

      {/* Подтверждение удаления договора */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить договор?</AlertDialogTitle>
            <AlertDialogDescription>
              Договор «{contract.number} — {contract.name}» и все связанные данные
              (участники, виды работ, ИД, ГПР и т.д.) будут удалены безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
