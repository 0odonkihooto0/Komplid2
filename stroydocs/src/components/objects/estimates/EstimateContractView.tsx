'use client';

import { FilePlus, Save, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEstimateContract } from '@/hooks/useEstimateContract';
import { useEstimateContractView } from './useEstimateContractView';
import { EstimateContractToolbar } from './EstimateContractToolbar';
import { ContractEstimateTable, type RowAction } from './ContractEstimateTable';
import { CreateContractEstimateDialog } from './CreateContractEstimateDialog';
import { SelectEstimateDialog } from './SelectEstimateDialog';
import { useToast } from '@/hooks/useToast';

// Форматирование рублей
const formatRub = (amount: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);

const VERSION_TYPE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  BASELINE: { label: 'Базовая', variant: 'default' },
  ACTUAL: { label: 'Актуальная', variant: 'secondary' },
  CORRECTIVE: { label: 'Корректировка', variant: 'outline' },
};

interface Props {
  objectId: string;
}

/** Страница «Смета контракта» */
export function EstimateContractView({ objectId }: Props) {
  const { toast } = useToast();
  const contract = useEstimateContract(objectId);
  const view = useEstimateContractView();

  const {
    contracts, contractsLoading, selectedContractId, setSelectedContractId,
    allVersions, versionsLoading, estimateContract,
    checkedVersionIds, toggleVersion, contractName, setContractName,
    sections, kpi, saveContract, createContract,
  } = contract;

  const exportUrl = selectedContractId
    ? `/api/objects/${objectId}/contracts/${selectedContractId}/estimate-contract/export`
    : '#';

  const canSave = !!selectedContractId && checkedVersionIds.size > 0;
  const hasContract = !!estimateContract;

  // Обработка действий строки
  const handleRowAction = (action: RowAction, itemId: string) => {
    switch (action) {
      case 'selectEstimate': view.openSelectEstimate(itemId); break;
      case 'addItem': toast({ title: 'Добавление позиции', description: 'Функция в разработке' }); break;
      case 'edit': toast({ title: 'Редактирование', description: 'Функция в разработке' }); break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Тулбар */}
      <EstimateContractToolbar
        hasContract={hasContract}
        disabled={!selectedContractId}
        onCreateContract={() => view.setCreateDialogOpen(true)}
        onCreateSection={view.handleCreateSection}
        onCreateSectionFromRef={view.handleCreateSectionFromRef}
        onExportTemplate={view.handleExportTemplate}
        onDownload={() => { if (selectedContractId) window.open(exportUrl); }}
        onRecalculate={view.handleRecalculate}
        onParams={view.handleParams}
        onPrint={view.handlePrint}
      />

      {/* Шапка: выбор договора + название + кнопки */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedContractId ?? ''} onValueChange={setSelectedContractId} disabled={contractsLoading || contracts.length === 0}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder={contractsLoading ? 'Загрузка...' : 'Выберите договор'} />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.number ? `${c.number} — ` : ''}{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="w-64"
          placeholder="Название сметы контракта"
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          disabled={!selectedContractId}
        />

        <Button size="sm" disabled={!canSave || saveContract.isPending} onClick={() => saveContract.mutate()}>
          <Save className="mr-2 h-4 w-4" />
          {saveContract.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>

        <Button size="sm" variant="outline" disabled={!selectedContractId} onClick={() => { if (selectedContractId) window.open(exportUrl); }}>
          <Download className="mr-2 h-4 w-4" />
          Экспорт в Excel
        </Button>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Всего по смете', value: kpi.total },
          { label: 'ФОТ', value: kpi.labor },
          { label: 'Материалы', value: kpi.mat },
          { label: 'Накладные', value: kpi.overhead },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatRub(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Версии с чекбоксами */}
      {!selectedContractId ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Выберите договор для формирования сметы контракта
        </div>
      ) : versionsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : allVersions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
          <p>По данному договору нет версий смет</p>
          <Button variant="outline" onClick={() => view.setCreateDialogOpen(true)}>
            <FilePlus className="mr-2 h-4 w-4" />
            Создать смету контракта
          </Button>
        </div>
      ) : (
        <>
          {/* Таблица выбора версий */}
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-3 py-2 text-center" />
                  <th className="px-3 py-2 text-left">Версия сметы</th>
                  <th className="px-3 py-2 text-left">Тип</th>
                  <th className="px-3 py-2 text-right">Итого, ₽</th>
                  <th className="px-3 py-2 text-right">ФОТ, ₽</th>
                  <th className="px-3 py-2 text-right">Материалы, ₽</th>
                </tr>
              </thead>
              <tbody>
                {allVersions.map((v) => {
                  const cfg = VERSION_TYPE_CONFIG[v.versionType] ?? VERSION_TYPE_CONFIG.ACTUAL;
                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={checkedVersionIds.has(v.id)} onCheckedChange={() => toggleVersion(v.id)} aria-label={`Включить ${v.name}`} />
                      </td>
                      <td className="px-3 py-2 font-medium">{v.name}</td>
                      <td className="px-3 py-2"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.totalAmount !== null ? formatRub(v.totalAmount) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.totalLabor !== null ? formatRub(v.totalLabor) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.totalMat !== null ? formatRub(v.totalMat) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Иерархическая таблица разделов и позиций */}
          {checkedVersionIds.size > 0 && sections.length > 0 && (
            <ContractEstimateTable
              sections={sections}
              expandedSections={view.expandedSections}
              onToggleSection={view.toggleSection}
              onRowAction={handleRowAction}
            />
          )}
        </>
      )}

      {/* Диалоги */}
      <CreateContractEstimateDialog
        open={view.createDialogOpen}
        onOpenChange={view.setCreateDialogOpen}
        onSubmit={async (data) => { await createContract.mutateAsync(data); }}
        isSubmitting={createContract.isPending}
      />

      <SelectEstimateDialog
        open={view.selectEstimateOpen}
        onOpenChange={(open) => { if (!open) view.closeSelectEstimate(); }}
        versions={allVersions}
        objectId={objectId}
        contractId={selectedContractId}
      />
    </div>
  );
}
