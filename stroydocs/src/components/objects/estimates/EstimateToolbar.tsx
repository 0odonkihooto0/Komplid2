'use client';

import {
  Upload,
  FileSpreadsheet,
  ChevronDown,
  Trash2,
  RefreshCw,
  RotateCcw,
  FileText,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ContractOption } from '@/hooks/useEstimateVersions';

interface Props {
  contracts: ContractOption[];
  contractsLoading: boolean;
  selectedContractId: string | null;
  onContractChange: (id: string) => void;
  onImport: () => void;
  onExportTemplate: () => void;
  onShowAdditionalCosts: () => void;
  onDeleteSelected: () => void;
  onRecalculateSelected: () => void;
  onReloadSelected: () => void;
  onCreateContractEstimate: () => void;
}

/** Панель инструментов реестра смет */
export function EstimateToolbar({
  contracts,
  contractsLoading,
  selectedContractId,
  onContractChange,
  onImport,
  onExportTemplate,
  onShowAdditionalCosts,
  onDeleteSelected,
  onRecalculateSelected,
  onReloadSelected,
  onCreateContractEstimate,
}: Props) {
  const disabled = !selectedContractId;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Левая часть: выбор договора */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Договор:</span>
        <Select
          value={selectedContractId ?? ''}
          onValueChange={onContractChange}
          disabled={contractsLoading || contracts.length === 0}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder={contractsLoading ? 'Загрузка...' : 'Выберите договор'} />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.number ? `${c.number} — ` : ''}{c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Правая часть: кнопки действий */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onShowAdditionalCosts}>
          <Eye className="mr-2 h-4 w-4" />
          Показать общие ДЗ
        </Button>

        <Button variant="outline" size="sm" disabled={disabled} onClick={onImport}>
          <Upload className="mr-2 h-4 w-4" />
          Импорт смет
        </Button>

        <Button variant="outline" size="sm" disabled={disabled} onClick={onExportTemplate}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Загрузить Excel шаблон
        </Button>

        {/* Dropdown «Действия» */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              Действия
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить выбранные
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRecalculateSelected}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Пересчитать выбранные
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReloadSelected}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Перезагрузить выбранные
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateContractEstimate}>
              <FileText className="mr-2 h-4 w-4" />
              Создать смету контракта
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
