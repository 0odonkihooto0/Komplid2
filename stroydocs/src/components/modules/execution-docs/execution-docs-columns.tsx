'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Stamp, Link2 } from 'lucide-react';
import { formatDate } from '@/utils/format';
import {
  EXECUTION_DOC_TYPE_LABELS,
  EXECUTION_DOC_STATUS_LABELS,
  ID_CATEGORY_LABELS,
  ID_CATEGORY_COLORS,
} from '@/utils/constants';
import type { ExecutionDocType, ExecutionDocStatus, IdCategory, ApprovalRouteStatus } from '@prisma/client';

/** Расширенная строка реестра ИД — все поля необходимые для таблицы */
export interface ExecutionDocRow {
  id: string;
  number: string;
  title: string;
  type: ExecutionDocType;
  status: ExecutionDocStatus;
  idCategory: IdCategory | null;
  documentDate: string | null;
  generatedAt: string | null;
  stampS3Key: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  category: { id: string; name: string } | null;
  approvalRoute: { status: ApprovalRouteStatus; createdAt: string } | null;
  _count: {
    signatures: number;
    comments: number;
    linksAsSource: number;
    linksAsTarget: number;
  };
  openCommentsCount: number;
}

/** Метаданные колонки (для диалога видимости) */
export interface ColumnMeta {
  id: string;
  label: string;
  /** Показывается по умолчанию */
  defaultVisible: boolean;
}

/** Все доступные колонки с метаданными */
export const ALL_COLUMNS: ColumnMeta[] = [
  { id: 'number',          label: '№',                      defaultVisible: true },
  { id: 'type',            label: 'Тип',                    defaultVisible: true },
  { id: 'idCategory',      label: 'Группа ИД',              defaultVisible: true },
  { id: 'title',           label: 'Наименование',           defaultVisible: true },
  { id: 'status',          label: 'Статус',                 defaultVisible: true },
  { id: 'stamp',           label: 'Штамп',                  defaultVisible: false },
  { id: 'linkedDocs',      label: 'Связанные документы',    defaultVisible: false },
  { id: 'documentDate',    label: 'Дата документа',         defaultVisible: false },
  { id: 'category',        label: 'Категория',              defaultVisible: false },
  { id: 'lastEditedAt',    label: 'Версия (правки)',         defaultVisible: false },
  { id: 'approvalStatus',  label: 'Статус согласования',    defaultVisible: false },
  { id: 'openComments',    label: 'Акт. замечания',         defaultVisible: false },
  { id: 'approvalStartDate', label: 'Начало согласования',  defaultVisible: false },
  { id: 'generatedAt',     label: 'PDF',                    defaultVisible: true },
  { id: 'comments',        label: 'Замечания (всего)',       defaultVisible: true },
  { id: 'createdAt',       label: 'Создан',                 defaultVisible: true },
];

/** ID колонок видимых по умолчанию */
export const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);

/** Цветовые классы для статуса согласования */
const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING:         'bg-yellow-100 text-yellow-800',
  APPROVED:        'bg-green-100 text-green-800',
  REJECTED:        'bg-red-100 text-red-800',
  RESET:           'bg-gray-100 text-gray-800',
  PENDING_REMARKS: 'bg-orange-100 text-orange-800',
};

/** Русские названия статусов согласования */
const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING:         'На согласовании',
  APPROVED:        'Согласован',
  REJECTED:        'Отклонён',
  RESET:           'Сброшен',
  PENDING_REMARKS: 'Есть замечания',
};

/** Статус ИД — цвета */
const DOC_STATUS_COLORS: Record<ExecutionDocStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  SIGNED:    'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800',
};

/** Полная карта всех ColumnDef — включаем по visibleIds */
function buildColumnMap(): Record<string, ColumnDef<ExecutionDocRow>> {
  return {
    number: {
      accessorKey: 'number',
      header: '№',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.number}</span>,
    },
    type: {
      accessorKey: 'type',
      header: 'Тип',
      cell: ({ row }) => EXECUTION_DOC_TYPE_LABELS[row.original.type],
    },
    idCategory: {
      accessorKey: 'idCategory',
      header: 'Группа ИД',
      cell: ({ row }) => {
        const cat = row.original.idCategory;
        if (!cat) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ID_CATEGORY_COLORS[cat]}`}>
            {ID_CATEGORY_LABELS[cat]}
          </span>
        );
      },
    },
    title: {
      accessorKey: 'title',
      header: 'Наименование',
      enableHiding: false,
    },
    status: {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DOC_STATUS_COLORS[s]}`}>
            {EXECUTION_DOC_STATUS_LABELS[s]}
          </span>
        );
      },
    },
    stamp: {
      id: 'stamp',
      header: 'Штамп',
      cell: ({ row }) =>
        row.original.stampS3Key ? (
          <Stamp className="h-4 w-4 text-blue-600" aria-label="Штамп применён" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    linkedDocs: {
      id: 'linkedDocs',
      header: 'Связанные',
      cell: ({ row }) => {
        const total = row.original._count.linksAsSource + row.original._count.linksAsTarget;
        if (total === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-sm">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            {total}
          </span>
        );
      },
    },
    documentDate: {
      accessorKey: 'documentDate',
      header: 'Дата',
      cell: ({ row }) =>
        row.original.documentDate ? formatDate(row.original.documentDate) : <span className="text-muted-foreground">—</span>,
    },
    category: {
      id: 'category',
      header: 'Категория',
      cell: ({ row }) =>
        row.original.category?.name ?? <span className="text-muted-foreground">—</span>,
    },
    lastEditedAt: {
      accessorKey: 'lastEditedAt',
      header: 'Версия',
      cell: ({ row }) => {
        const d = row.original.lastEditedAt;
        if (!d) return <span className="text-muted-foreground">—</span>;
        return <span className="text-xs text-muted-foreground">{formatDate(d)} (ред.)</span>;
      },
    },
    approvalStatus: {
      id: 'approvalStatus',
      header: 'Статус согл.',
      cell: ({ row }) => {
        const route = row.original.approvalRoute;
        if (!route) return <span className="text-muted-foreground">—</span>;
        const s = route.status as string;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-800'}`}>
            {APPROVAL_STATUS_LABELS[s] ?? s}
          </span>
        );
      },
    },
    openComments: {
      id: 'openComments',
      header: 'Акт. замеч.',
      cell: ({ row }) => {
        const count = row.original.openCommentsCount;
        if (count === 0) return <span className="text-muted-foreground">—</span>;
        return <span className="font-medium text-orange-600">{count}</span>;
      },
    },
    approvalStartDate: {
      id: 'approvalStartDate',
      header: 'Начало согл.',
      cell: ({ row }) => {
        const route = row.original.approvalRoute;
        return route ? formatDate(route.createdAt) : <span className="text-muted-foreground">—</span>;
      },
    },
    generatedAt: {
      accessorKey: 'generatedAt',
      header: 'PDF',
      cell: ({ row }) =>
        row.original.generatedAt ? formatDate(row.original.generatedAt) : <span className="text-muted-foreground">—</span>,
    },
    comments: {
      id: 'comments',
      header: 'Замечания',
      cell: ({ row }) => {
        const count = row.original._count.comments;
        return count > 0 ? count : <span className="text-muted-foreground">—</span>;
      },
    },
    createdAt: {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  };
}

/**
 * Возвращает массив ColumnDef по списку видимых id.
 * Порядок соответствует ALL_COLUMNS.
 */
export function buildColumns(visibleIds: string[]): ColumnDef<ExecutionDocRow>[] {
  const visibleSet = new Set(visibleIds);
  const map = buildColumnMap();
  return ALL_COLUMNS
    .filter((meta) => visibleSet.has(meta.id))
    .map((meta) => map[meta.id])
    .filter(Boolean) as ColumnDef<ExecutionDocRow>[];
}
