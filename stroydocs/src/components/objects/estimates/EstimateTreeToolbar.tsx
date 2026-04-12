'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  PencilOff,
  Download,
  Printer,
  RefreshCw,
  Clock,
  ChevronDown,
  PlusCircle,
  Settings2,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EstimateVersionStatus, EstimateCoefficientDetail } from '@/hooks/useEstimateTree';

// Конфигурация статусов версии сметы
const STATUS_CONFIG: Record<EstimateVersionStatus, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-green-100 text-green-800' },
  EDITING: { label: 'Редактируется', className: 'bg-yellow-100 text-yellow-800' },
  RECALCULATING: { label: 'Пересчёт', className: 'bg-blue-100 text-blue-800' },
  ERROR: { label: 'Ошибка', className: 'bg-red-100 text-red-800' },
};

const FORMAT_LABELS: Record<string, string> = {
  XML_GRAND_SMETA: 'XML Гранд-Смета',
  XML_RIK: 'XML РИК',
  EXCEL: 'Excel',
  PDF: 'PDF',
};

interface Props {
  objectId: string;
  versionName: string;
  status: EstimateVersionStatus;
  format: string | null;
  editMode: boolean;
  isBaseline: boolean;
  isToggling: boolean;
  coefficients: EstimateCoefficientDetail[];
  onToggleEditMode: () => void;
  onRecalculate: () => void;
  onRenumber: () => void;
  onExportTemplate: () => void;
  onShowHistory: () => void;
  onAddChapter: () => void;
}

/** Тулбар версии сметы: шапка, меню, кнопки действий */
export function EstimateTreeToolbar({
  objectId,
  versionName,
  status,
  format,
  editMode,
  isBaseline,
  isToggling,
  coefficients,
  onToggleEditMode,
  onRecalculate,
  onRenumber,
  onExportTemplate,
  onShowHistory,
  onAddChapter,
}: Props) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-3">
      {/* Строка 1: навигация + статус + название + формат */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/objects/${objectId}/estimates`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Все сметы
        </Button>
        <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
        <h1 className="text-lg font-semibold truncate">{versionName}</h1>
        {format && (
          <Badge variant="outline" className="text-xs">
            {FORMAT_LABELS[format] ?? format}
          </Badge>
        )}
      </div>

      {/* Строка 2: dropdown меню + кнопки действий */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Dropdown-меню */}
        <MenuDropdown label="Индексы">
          <DropdownMenuItem disabled>Настройка индексов (в разработке)</DropdownMenuItem>
        </MenuDropdown>

        <MenuDropdown label="Коэффициенты">
          {coefficients.length === 0 ? (
            <DropdownMenuItem disabled>Нет коэффициентов</DropdownMenuItem>
          ) : (
            coefficients.map((c) => (
              <DropdownMenuItem key={c.id} disabled>
                <span className={c.isEnabled ? '' : 'text-red-500 line-through'}>
                  {c.name} ({c.value})
                </span>
              </DropdownMenuItem>
            ))
          )}
        </MenuDropdown>

        <MenuDropdown label="Доп. затраты">
          <DropdownMenuItem disabled>Управление ДЗ (в разработке)</DropdownMenuItem>
        </MenuDropdown>

        <MenuDropdown label="Виды работ">
          <DropdownMenuItem disabled>Фильтр по видам (в разработке)</DropdownMenuItem>
        </MenuDropdown>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Кнопки действий */}
        <Button
          size="sm"
          variant={editMode ? 'default' : 'outline'}
          onClick={onToggleEditMode}
          disabled={isBaseline || isToggling}
        >
          {editMode ? <PencilOff className="mr-1.5 h-4 w-4" /> : <Pencil className="mr-1.5 h-4 w-4" />}
          {editMode ? 'Завершить редактирование' : 'Режим редактирования'}
        </Button>

        <Button size="sm" variant="outline" onClick={onExportTemplate}>
          <Download className="mr-1.5 h-4 w-4" />
          Экспорт
        </Button>

        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Печать
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onRecalculate}
          disabled={isBaseline}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Пересчитать
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onRenumber}
          disabled={isBaseline}
        >
          <Hash className="mr-1.5 h-4 w-4" />
          Перенумеровать
        </Button>

        <Button size="sm" variant="outline" onClick={onShowHistory}>
          <Clock className="mr-1.5 h-4 w-4" />
          История
        </Button>

        {/* Дополнительные кнопки в режиме редактирования */}
        {editMode && (
          <>
            <div className="h-6 w-px bg-border mx-1" />
            <Button size="sm" onClick={onAddChapter}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              +Раздел
            </Button>
            <Button size="sm" variant="outline" disabled>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Настройки коэффициентов
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Вспомогательный компонент для dropdown-меню тулбара */
function MenuDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {label}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
