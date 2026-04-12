'use client';

import {
  Plus,
  BookOpen,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Settings,
  Printer,
  ChevronDown,
  FilePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  hasContract: boolean;
  disabled: boolean;
  onCreateContract: () => void;
  onCreateSection: () => void;
  onCreateSectionFromRef: () => void;
  onExportTemplate: () => void;
  onDownload: () => void;
  onRecalculate: () => void;
  onParams: () => void;
  onPrint: () => void;
}

/** Тулбар сметы контракта */
export function EstimateContractToolbar({
  hasContract,
  disabled,
  onCreateContract,
  onCreateSection,
  onCreateSectionFromRef,
  onExportTemplate,
  onDownload,
  onRecalculate,
  onParams,
  onPrint,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {/* Действия dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              Действия
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onCreateContract}>
              <FilePlus className="mr-2 h-4 w-4" />
              Создать смету контракта
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasContract && (
          <>
            <Button variant="outline" size="sm" disabled={disabled} onClick={onCreateSection}>
              <Plus className="mr-2 h-4 w-4" />
              Создать раздел
            </Button>
            <Button variant="outline" size="sm" disabled={disabled} onClick={onCreateSectionFromRef}>
              <BookOpen className="mr-2 h-4 w-4" />
              Раздел из справочника
            </Button>
          </>
        )}
      </div>

      {hasContract && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={disabled} onClick={onExportTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Экспорт в шаблон
          </Button>
          <Button variant="outline" size="sm" disabled={disabled} onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Скачать
          </Button>
          <Button variant="outline" size="sm" disabled={disabled} onClick={onRecalculate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Пересчитать
          </Button>
          <Button variant="outline" size="sm" disabled={disabled} onClick={onParams}>
            <Settings className="mr-2 h-4 w-4" />
            Параметры
          </Button>
          <Button variant="outline" size="icon" onClick={onPrint} title="Печать">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
