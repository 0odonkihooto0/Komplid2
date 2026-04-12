'use client';

import { GitCompare, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEstimateCompare } from '@/hooks/useEstimateCompare';
import type { CompareMode } from '@/hooks/useEstimateCompare';
import { CompareKpiCards } from './CompareKpiCards';
import { EstimateCompareDiffTable } from './EstimateCompareDiffTable';
import { CompareVolumesTable } from './CompareVolumesTable';
import { CompareCostTable } from './CompareCostTable';
import { CompareContractSummary } from './CompareContractSummary';

const FORMAT_OPTIONS: { value: CompareMode; label: string }[] = [
  { value: 'default', label: 'Отображение по умолчанию' },
  { value: 'volumes', label: 'Сопоставительная ведомость объёмов работ' },
  { value: 'cost', label: 'Сопоставительная ведомость изменения сметной стоимости' },
  { value: 'contract', label: 'Смета контракта (с изменениями)' },
];

interface Props {
  objectId: string;
}

/** Вкладка «Сравнение версий» */
export function EstimateCompareView({ objectId }: Props) {
  const {
    contracts, contractsLoading, selectedContractId, setSelectedContractId,
    versions, versionsLoading, v1Id, setV1Id, v2Id, setV2Id,
    compareMode, setCompareMode,
    canCompare, runCompare, compareResult, compareLoading,
  } = useEstimateCompare(objectId);

  return (
    <div className="space-y-4">
      {/* Панель выбора версий */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedContractId ?? ''} onValueChange={setSelectedContractId} disabled={contractsLoading || contracts.length === 0}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={contractsLoading ? 'Загрузка...' : 'Договор'} />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.number ? `${c.number} — ` : ''}{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={v1Id ?? ''} onValueChange={setV1Id} disabled={!selectedContractId || versionsLoading}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Смета (база)" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id} disabled={v.id === v2Id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={v2Id ?? ''} onValueChange={setV2Id} disabled={!selectedContractId || versionsLoading}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Смета для сравнения" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id} disabled={v.id === v1Id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={runCompare} disabled={!canCompare || compareLoading}>
          <GitCompare className="mr-2 h-4 w-4" />
          {compareLoading ? 'Сравниваем...' : 'Сравнить сметы'}
        </Button>

        <Button variant="outline" size="icon" onClick={() => window.print()} title="Печать">
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      {/* Формат результата */}
      <RadioGroup value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)} className="flex flex-wrap gap-4">
        {FORMAT_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem value={opt.value} id={`fmt-${opt.value}`} />
            <Label htmlFor={`fmt-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>

      {/* Пустые состояния */}
      {!selectedContractId && (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Выберите договор для сравнения версий смет
        </div>
      )}
      {selectedContractId && !compareResult && !compareLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <GitCompare className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Выберите две сметы и нажмите <strong>Сравнить сметы</strong>
          </p>
        </div>
      )}

      {compareLoading && <Skeleton className="h-64 w-full rounded-md" />}

      {/* Результат */}
      {compareResult && !compareLoading && (
        <>
          <CompareKpiCards result={compareResult} />
          {compareMode === 'default' && <EstimateCompareDiffTable result={compareResult} />}
          {compareMode === 'volumes' && <CompareVolumesTable formatted={compareResult.formatted} />}
          {compareMode === 'cost' && <CompareCostTable formatted={compareResult.formatted} />}
          {compareMode === 'contract' && <CompareContractSummary formatted={compareResult.formatted} />}
        </>
      )}
    </div>
  );
}
