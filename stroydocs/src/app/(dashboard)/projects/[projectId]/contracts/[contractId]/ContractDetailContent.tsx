'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useContract } from '@/components/modules/contracts/useContract';
import { ContractKpiBar } from '@/components/modules/contracts/ContractKpiBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
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
    </div>
  );
}
