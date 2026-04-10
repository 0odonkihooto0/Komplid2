'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate, formatBytes } from '@/utils/format';
import {
  useContractDocLinks,
  type DocLinkType,
  type ContractDocLinkItem,
} from './useContractDocLinks';
import { AddDocLinkDialog } from './AddDocLinkDialog';

interface Props {
  projectId: string;
  contractId: string;
  linkType: DocLinkType;
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
}

const LINK_TYPE_LABELS: Record<DocLinkType, string> = {
  ZNP: 'Задание на проектирование',
  ZNII: 'Задание на инженерные изыскания',
};

export function ContractDocLinksTab({
  projectId,
  contractId,
  linkType,
  addOpen,
  setAddOpen,
}: Props) {
  const { links, isLoading, deleteMutation } = useContractDocLinks(
    projectId,
    contractId,
    linkType,
  );

  const columns: ColumnDef<ContractDocLinkItem>[] = [
    {
      accessorKey: 'document.name',
      header: 'Название',
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.document.name}</span>
      ),
    },
    {
      accessorKey: 'document.folder.name',
      header: 'Папка',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.document.folder.name}
        </span>
      ),
    },
    {
      accessorKey: 'document.fileSize',
      header: 'Размер',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatBytes(row.original.document.fileSize)}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Привязан',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Удалить привязку"
          onClick={() => deleteMutation.mutate(row.original.id)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {LINK_TYPE_LABELS[linkType]}
        </h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          title="Нет привязанных документов"
          description={`Добавьте ${LINK_TYPE_LABELS[linkType].toLowerCase()} из хранилища объекта`}
        />
      ) : (
        <DataTable columns={columns} data={links} />
      )}

      <AddDocLinkDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        contractId={contractId}
        linkType={linkType}
      />
    </div>
  );
}
