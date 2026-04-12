'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  MoreHorizontal,
  FileText,
  FileQuestion,
  Info,
  Pencil,
  Eye,
  RotateCcw,
  Link2,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImportEstimateDialog } from '@/components/modules/estimates/ImportEstimateDialog';
import { CreateVersionDialog } from './CreateVersionDialog';
import { EstimateSummaryBar } from './EstimateSummaryBar';
import { EstimateToolbar } from './EstimateToolbar';
import { EstimateCategoryTree } from './EstimateCategoryTree';
import { EstimateInfoPanel } from './EstimateInfoPanel';
import { AdditionalCostsDialog } from './AdditionalCostsDialog';
import { useEstimateCategories } from './useEstimateCategories';
import {
  useEstimateList,
  getCustomer,
  getPerformer,
  type EstimateListItem,
} from './useEstimateList';
import { useToast } from '@/hooks/useToast';

// ─── Конфигурация статусов ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-green-100 text-green-800' },
  EDITING: { label: 'Редактируется', className: 'bg-yellow-100 text-yellow-800' },
  RECALCULATING: { label: 'Пересчёт', className: 'bg-blue-100 text-blue-800' },
  ERROR: { label: 'Ошибка', className: 'bg-red-100 text-red-800' },
};

// ─── Контекстное меню (позиция по курсору) ──────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  item: EstimateListItem;
}

// ─── Компонент ──────────────────────────────────────────────────────────────

interface Props {
  objectId: string;
}

/** Реестр смет — основная вкладка «Сметы» */
export function EstimateListView({ objectId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [additionalCostsOpen, setAdditionalCostsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Категории
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    createCategory,
    renameCategory,
    deleteCategory,
  } = useEstimateCategories(objectId);

  // Список версий
  const {
    contracts,
    contractsLoading,
    selectedContractId,
    setSelectedContractId,
    versions,
    expandedId,
    toggleExpand,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    allSelected,
    someSelected,
    createVersion,
    setActual,
    setBaseline,
    copyVersion,
    recalculate,
    deleteVersion,
  } = useEstimateList(objectId, selectedCategoryId);

  // Закрытие контекстного меню при клике вне
  useEffect(() => {
    if (!ctxMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ctxMenu]);

  // ─── Навигация ────────────────────────────────────────────────────────────

  const versionUrl = useCallback(
    (id: string) => `/objects/${objectId}/estimates/${id}?contractId=${selectedContractId ?? ''}`,
    [objectId, selectedContractId],
  );

  // ─── Действия контекстного меню ──────────────────────────────────────────

  const handleCtxAction = useCallback(
    (action: string, item: EstimateListItem) => {
      setCtxMenu(null);
      switch (action) {
        case 'info': toggleExpand(item.id); break;
        case 'edit': router.push(versionUrl(item.id)); break;
        case 'view': router.push(versionUrl(item.id)); break;
        case 'reload': recalculate.mutate(item.id); break;
        case 'copy-link': {
          void navigator.clipboard.writeText(`${window.location.origin}${versionUrl(item.id)}`);
          toast({ title: 'Ссылка скопирована' });
          break;
        }
        case 'delete': {
          if (confirm(`Удалить версию «${item.name}»?`)) deleteVersion.mutate(item.id);
          break;
        }
      }
    },
    [toggleExpand, router, versionUrl, recalculate, deleteVersion, toast],
  );

  // ─── Колонки TanStack Table ───────────────────────────────────────────────

  const columns: ColumnDef<EstimateListItem, unknown>[] = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allSelected}
          data-state={someSelected ? 'indeterminate' : undefined}
          onCheckedChange={toggleSelectAll}
          aria-label="Выбрать все"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Выбрать"
        />
      ),
      size: 32,
      enableSorting: false,
    },
    {
      id: 'file',
      header: '',
      cell: ({ row }) => (
        row.original.sourceImportId
          ? <FileText className="h-4 w-4 text-blue-500" />
          : <FileQuestion className="h-4 w-4 text-muted-foreground" />
      ),
      size: 32,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.OK;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
      size: 100,
    },
    {
      id: 'chapters',
      header: 'Глава',
      cell: ({ row }) => row.original._count.chapters || '—',
      size: 70,
    },
    {
      accessorKey: 'period',
      header: 'Период',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
      size: 100,
    },
    {
      accessorKey: 'name',
      header: 'Наименование',
      cell: ({ row }) => (
        <button
          className="text-left font-medium hover:underline text-primary truncate max-w-[200px]"
          onClick={(e) => { e.stopPropagation(); router.push(versionUrl(row.original.id)); }}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: 'contract',
      header: 'Контракт',
      cell: ({ row }) => {
        const c = row.original.contract;
        return <span className="truncate max-w-[140px] block">{c.number || c.name}</span>;
      },
      size: 140,
    },
    {
      id: 'customer',
      header: 'Заказчик',
      cell: ({ row }) => <span className="truncate max-w-[120px] block">{getCustomer(row.original)}</span>,
      size: 130,
    },
    {
      id: 'performer',
      header: 'Исполнитель',
      cell: ({ row }) => <span className="truncate max-w-[120px] block">{getPerformer(row.original)}</span>,
      size: 130,
    },
    {
      id: 'category',
      header: 'Категория',
      cell: ({ row }) => row.original.category?.name ?? '—',
      size: 120,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const v = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleExpand(v.id)}>
                <Info className="mr-2 h-4 w-4" /> Информация
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(versionUrl(v.id))}>
                <Pencil className="mr-2 h-4 w-4" /> Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(versionUrl(v.id))}>
                <Eye className="mr-2 h-4 w-4" /> Просмотр
              </DropdownMenuItem>
              {!v.isActual && (
                <DropdownMenuItem onClick={() => setActual.mutate(v.id)}>Сделать актуальной</DropdownMenuItem>
              )}
              {!v.isBaseline && (
                <DropdownMenuItem onClick={() => setBaseline.mutate(v.id)}>Сделать базовой</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => copyVersion.mutate(v.id)}>Создать копию</DropdownMenuItem>
              <DropdownMenuItem onClick={() => recalculate.mutate(v.id)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Перезагрузить из файла
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}${versionUrl(v.id)}`);
                toast({ title: 'Ссылка скопирована' });
              }}>
                <Link2 className="mr-2 h-4 w-4" /> Скопировать ссылку
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                disabled={v.isBaseline}
                onClick={() => { if (confirm(`Удалить версию «${v.name}»?`)) deleteVersion.mutate(v.id); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 40,
      enableSorting: false,
    },
  ], [allSelected, someSelected, toggleSelectAll, selectedIds, toggleSelect, router, versionUrl, toggleExpand, setActual, setBaseline, copyVersion, recalculate, deleteVersion, toast]);

  const table = useReactTable({
    data: versions,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // ─── Заглушки тулбара ─────────────────────────────────────────────────────

  const handleExportTemplate = () => toast({ title: 'Загрузка шаблона Excel...' });
  const handleShowAdditionalCosts = () => setAdditionalCostsOpen(true);
  const handleDeleteSelected = () => toast({ title: 'Выберите версии для удаления' });
  const handleRecalculateSelected = () => toast({ title: 'Выберите версии для пересчёта' });
  const handleReloadSelected = () => toast({ title: 'Выберите версии для перезагрузки' });

  return (
    <div className="space-y-4">
      {/* Панель инструментов */}
      <EstimateToolbar
        contracts={contracts}
        contractsLoading={contractsLoading}
        selectedContractId={selectedContractId}
        onContractChange={setSelectedContractId}
        onImport={() => setImportOpen(true)}
        onExportTemplate={handleExportTemplate}
        onShowAdditionalCosts={handleShowAdditionalCosts}
        onDeleteSelected={handleDeleteSelected}
        onRecalculateSelected={handleRecalculateSelected}
        onReloadSelected={handleReloadSelected}
        onCreateContractEstimate={() => router.push(`/objects/${objectId}/estimates/contract`)}
      />

      {/* Суммарные показатели */}
      {selectedContractId && versions.length > 0 && (
        <EstimateSummaryBar versions={versions} />
      )}

      {/* Двухколоночный layout */}
      <div className="flex gap-4">
        {/* Левая панель — категории (200px) */}
        <aside className="w-[200px] shrink-0 rounded-md border">
          <EstimateCategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onNavigateContract={() => router.push(`/objects/${objectId}/estimates/contract`)}
            onCreateCategory={(p) => createCategory.mutate(p)}
            onRenameCategory={(p) => renameCategory.mutate(p)}
            onDeleteCategory={(id) => deleteCategory.mutate(id)}
            isCreating={createCategory.isPending}
          />
        </aside>

        {/* Правая панель — таблица */}
        <div className="flex-1 min-w-0 space-y-2">
          {!selectedContractId ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Выберите договор для просмотра смет
            </div>
          ) : (
            <>
              {/* Поиск */}
              <Input
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />

              {/* Таблица */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead key={header.id} style={{ width: header.column.getSize() }}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          Нет смет
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => {
                        const isExpanded = expandedId === row.original.id;
                        return (
                          <TableRowWithPanel
                            key={row.id}
                            row={row}
                            isExpanded={isExpanded}
                            columnsCount={columns.length}
                            objectId={objectId}
                            onRowClick={() => toggleExpand(row.original.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setCtxMenu({ x: e.clientX, y: e.clientY, item: row.original });
                            }}
                          />
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Количество записей */}
              <p className="text-xs text-muted-foreground">
                Всего: {table.getRowModel().rows.length} {selectedIds.size > 0 && `· Выбрано: ${selectedIds.size}`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Контекстное меню по правому клику */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <CtxMenuItem icon={<Info className="h-4 w-4" />} label="Информация" onClick={() => handleCtxAction('info', ctxMenu.item)} />
          <CtxMenuItem icon={<Pencil className="h-4 w-4" />} label="Редактировать" onClick={() => handleCtxAction('edit', ctxMenu.item)} />
          <CtxMenuItem icon={<Eye className="h-4 w-4" />} label="Просмотр" onClick={() => handleCtxAction('view', ctxMenu.item)} />
          <CtxMenuItem icon={<RotateCcw className="h-4 w-4" />} label="Перезагрузить из файла" onClick={() => handleCtxAction('reload', ctxMenu.item)} />
          <CtxMenuItem icon={<Link2 className="h-4 w-4" />} label="Скопировать ссылку" onClick={() => handleCtxAction('copy-link', ctxMenu.item)} />
          <div className="my-1 h-px bg-border" />
          <CtxMenuItem icon={<Trash2 className="h-4 w-4" />} label="Удалить" destructive onClick={() => handleCtxAction('delete', ctxMenu.item)} />
        </div>
      )}

      {/* Диалоги */}
      {selectedContractId && (
        <ImportEstimateDialog open={importOpen} onOpenChange={setImportOpen} projectId={objectId} contractId={selectedContractId} />
      )}
      <CreateVersionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (data) => { await createVersion.mutateAsync(data); }}
      />

      {/* Диалог общих ДЗ объекта */}
      <AdditionalCostsDialog
        open={additionalCostsOpen}
        onOpenChange={setAdditionalCostsOpen}
        objectId={objectId}
      />
    </div>
  );
}

// ─── Строка таблицы с панелью ───────────────────────────────────────────────

function TableRowWithPanel({
  row,
  isExpanded,
  columnsCount,
  objectId,
  onRowClick,
  onContextMenu,
}: {
  row: ReturnType<ReturnType<typeof useReactTable<EstimateListItem>>['getRowModel']>['rows'][number];
  isExpanded: boolean;
  columnsCount: number;
  objectId: string;
  onRowClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onRowClick}
        onContextMenu={onContextMenu}
        data-state={isExpanded ? 'selected' : undefined}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={columnsCount} className="p-0">
            <EstimateInfoPanel item={row.original} objectId={objectId} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Пункт контекстного меню ────────────────────────────────────────────────

function CtxMenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${
        destructive ? 'text-destructive hover:text-destructive' : ''
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
