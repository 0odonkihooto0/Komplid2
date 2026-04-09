'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CreateContractDialog } from '@/components/modules/contracts/CreateContractDialog';
import { ContractCategorySidebar } from './ContractCategorySidebar';
import { ContractPaymentsSheet } from './ContractPaymentsSheet';
import { useManagementContracts, type MgmtContractItem } from './useManagementContracts';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import { formatCurrency } from '@/utils/format';
import type { ContractStatus } from '@prisma/client';

interface Props {
  objectId: string;
}

export function ManagementContractsView({ objectId }: Props) {
  const {
    contracts,
    allContracts,
    categories,
    isLoading,
    activeCategoryId,
    setActiveCategoryId,
    countByCategory,
  } = useManagementContracts(objectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<MgmtContractItem | null>(null);

  const mainContracts = allContracts.filter((c) => c.type === 'MAIN');

  return (
    <div className="flex gap-6 p-6">
      {/* Левая панель категорий */}
      <ContractCategorySidebar
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
        totalCount={allContracts.length}
        countByCategory={countByCategory}
      />

      {/* Основная область */}
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Договоры
            {activeCategoryId && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({contracts.length})
              </span>
            )}
          </h2>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить договор
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {activeCategoryId ? 'Нет договоров в выбранной категории' : 'Нет договоров — добавьте первый'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Номер</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Наименование</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Категория</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Сумма договора</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Освоено (КС-2)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contracts.map((contract) => (
                  <ContractRow
                    key={contract.id}
                    contract={contract}
                    objectId={objectId}
                    onPaymentsClick={() => setSelectedContract(contract)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={objectId}
        parentContracts={mainContracts.map((c) => ({ id: c.id, number: c.number, name: c.name }))}
      />

      <ContractPaymentsSheet
        contract={selectedContract}
        projectId={objectId}
        onClose={() => setSelectedContract(null)}
      />
    </div>
  );
}

function ContractRow({
  contract,
  objectId,
  onPaymentsClick,
}: {
  contract: MgmtContractItem;
  objectId: string;
  onPaymentsClick: () => void;
}) {
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
        {contract.category?.name ?? <span className="text-xs italic">Без категории</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {contract.totalAmount != null ? formatCurrency(contract.totalAmount) : '—'}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
        {contract.ks2Sum != null ? formatCurrency(contract.ks2Sum) : '—'}
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          status={contract.status}
          label={CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status}
        />
      </td>
      <td className="px-4 py-3">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onPaymentsClick}>
          Платежи
        </Button>
      </td>
    </tr>
  );
}
