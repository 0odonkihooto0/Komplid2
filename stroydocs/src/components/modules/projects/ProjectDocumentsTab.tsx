'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Archive, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  EXECUTION_DOC_TYPE_LABELS,
  EXECUTION_DOC_STATUS_LABELS,
  ARCHIVE_CATEGORY_LABELS,
} from '@/utils/constants';
import type { ExecutionDocType, ExecutionDocStatus, ArchiveCategory } from '@prisma/client';

interface ExecutionDocItem {
  id: string;
  number: string;
  title: string;
  type: ExecutionDocType;
  status: ExecutionDocStatus;
  createdAt: string;
}

interface ArchiveDocItem {
  id: string;
  fileName: string;
  category: ArchiveCategory;
  createdAt: string;
}

interface ContractWithDocs {
  id: string;
  number: string;
  name: string;
  executionDocs: ExecutionDocItem[];
  archiveDocs: ArchiveDocItem[];
}

interface Props {
  projectId: string;
}

function useProjectDocuments(projectId: string) {
  return useQuery<ContractWithDocs[]>({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

function ContractDocsSection({ contract, projectId }: { contract: ContractWithDocs; projectId: string }) {
  const [expanded, setExpanded] = useState(true);
  const totalDocs = contract.executionDocs.length + contract.archiveDocs.length;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-4 text-left hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium">{contract.number} — {contract.name}</span>
        <Badge variant="secondary" className="ml-auto">{totalDocs}</Badge>
        <Link
          href={`/objects/${projectId}/contracts/${contract.id}`}
          className="ml-2 text-muted-foreground hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </button>

      {expanded && totalDocs > 0 && (
        <div className="border-t px-4 pb-4 pt-2 space-y-4">
          {/* Исполнительная документация */}
          {contract.executionDocs.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <FileText className="h-3.5 w-3.5" />
                Исполнительная документация ({contract.executionDocs.length})
              </p>
              <div className="space-y-1">
                {contract.executionDocs.slice(0, 8).map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/objects/${projectId}/contracts/${contract.id}?tab=execution-docs`}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <span className="truncate font-medium">
                        {EXECUTION_DOC_TYPE_LABELS[doc.type] ?? doc.type} № {doc.number}
                      </span>
                      <span className="ml-1 text-muted-foreground truncate">{doc.title}</span>
                    </div>
                    <StatusBadge
                      status={doc.status}
                      label={EXECUTION_DOC_STATUS_LABELS[doc.status] ?? doc.status}
                      className="ml-2 shrink-0"
                    />
                  </Link>
                ))}
                {contract.executionDocs.length > 8 && (
                  <Link
                    href={`/objects/${projectId}/contracts/${contract.id}?tab=execution-docs`}
                    className="block px-2 py-1 text-xs text-primary hover:underline"
                  >
                    Ещё {contract.executionDocs.length - 8} документов →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Документарий */}
          {contract.archiveDocs.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <Archive className="h-3.5 w-3.5" />
                Документарий ({contract.archiveDocs.length})
              </p>
              <div className="space-y-1">
                {contract.archiveDocs.slice(0, 6).map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/objects/${projectId}/contracts/${contract.id}?tab=archive`}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted"
                  >
                    <span className="truncate font-medium">{doc.fileName}</span>
                    <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                      {ARCHIVE_CATEGORY_LABELS[doc.category] ?? doc.category}
                    </Badge>
                  </Link>
                ))}
                {contract.archiveDocs.length > 6 && (
                  <Link
                    href={`/objects/${projectId}/contracts/${contract.id}?tab=archive`}
                    className="block px-2 py-1 text-xs text-primary hover:underline"
                  >
                    Ещё {contract.archiveDocs.length - 6} файлов →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {expanded && totalDocs === 0 && (
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Документов в этом договоре пока нет
        </div>
      )}
    </div>
  );
}

export function ProjectDocumentsTab({ projectId }: Props) {
  const { data: contracts, isLoading } = useProjectDocuments(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет договоров. Создайте договор и загрузите документы.
      </p>
    );
  }

  const totalDocs = contracts.reduce(
    (sum, c) => sum + c.executionDocs.length + c.archiveDocs.length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Всего документов по проекту:{' '}
          <strong className="text-foreground">{totalDocs}</strong>
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/documents">Глобальный архив</Link>
        </Button>
      </div>
      {contracts.map((contract) => (
        <ContractDocsSection key={contract.id} contract={contract} projectId={projectId} />
      ))}
    </div>
  );
}
