'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CreateContractDialog } from '@/components/modules/contracts/CreateContractDialog';
import { useContractsTable, type ContractItem } from '@/components/modules/contracts/useContractsTable';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { ContractStatus } from '@prisma/client';

interface Props {
  objectId: string;
}

export function ContractsList({ objectId }: Props) {
  const { contracts, isLoading } = useContractsTable(objectId);
  const [createOpen, setCreateOpen] = useState(false);

  const mainContracts = contracts.filter((c) => c.type === 'MAIN');
  const contractsWithoutKind = contracts.filter((c) => !c.contractKindId).length;

  return (
    <div className="space-y-4">
      {contractsWithoutKind > 0 && !isLoading && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
          У {contractsWithoutKind} договор{contractsWithoutKind === 1 ? 'а' : 'ов'} не указан вид работ. Укажите для корректной аналитики.
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Договоры</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить договор
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Нет договоров — добавьте первый
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Номер</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Наименование</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тип</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Начало</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Окончание</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Субдоговоры</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contracts.map((contract) => (
                <ContractRow key={contract.id} contract={contract} objectId={objectId} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={objectId}
        parentContracts={mainContracts.map((c) => ({ id: c.id, number: c.number, name: c.name }))}
      />
    </div>
  );
}

function ContractRow({ contract, objectId }: { contract: ContractItem; objectId: string }) {
  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">
        <Link
          href={`/objects/${objectId}/contracts/${contract.id}`}
          className="text-primary hover:underline"
        >
          {contract.number}
        </Link>
      </td>
      <td className="max-w-xs truncate px-4 py-3">{contract.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {contract.type === 'MAIN' ? 'Основной' : 'Субдоговор'}
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          status={contract.status}
          label={CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status}
        />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {contract.startDate ? formatDate(contract.startDate) : '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {contract.endDate ? formatDate(contract.endDate) : '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{contract._count.subContracts}</td>
    </tr>
  );
}
