'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ExternalLink, FileText, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  EXECUTION_DOC_TYPE_LABELS,
  EXECUTION_DOC_STATUS_LABELS,
  ARCHIVE_CATEGORY_LABELS,
} from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { ExecutionDocStatus, ExecutionDocType, ArchiveCategory } from '@prisma/client';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface ContractRef {
  id: string;
  number: string;
  name: string;
  buildingObject: { id: string; name: string };
}

interface ExecutionDocRow {
  id: string;
  number: string;
  title: string;
  type: ExecutionDocType;
  status: ExecutionDocStatus;
  createdAt: string;
  contract: ContractRef;
}

interface ArchiveDocRow {
  id: string;
  fileName: string;
  category: ArchiveCategory;
  mimeType: string;
  certifiedCopy: boolean;
  createdAt: string;
  contract: ContractRef;
}

interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Хуки ────────────────────────────────────────────────────────────────────

function useGlobalExecutionDocs(search: string, page: number) {
  return useQuery<PagedResult<ExecutionDocRow>>({
    queryKey: ['global-docs-execution', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'execution', page: String(page), limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/documents/global?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

function useGlobalArchiveDocs(search: string, page: number) {
  return useQuery<PagedResult<ArchiveDocRow>>({
    queryKey: ['global-docs-archive', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'archive', page: String(page), limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/documents/global?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Компоненты вкладок ───────────────────────────────────────────────────────

function ExecutionDocsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGlobalExecutionDocs(search, page);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или номеру..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">
            Найдено: {data.total}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !data || data.data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Документов не найдено</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {data.data.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {EXECUTION_DOC_TYPE_LABELS[doc.type]} № {doc.number}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{doc.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.contract.buildingObject.name} → {doc.contract.number} {doc.contract.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge
                    status={doc.status}
                    label={EXECUTION_DOC_STATUS_LABELS[doc.status]}
                  />
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(doc.createdAt)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`/objects/${doc.contract.buildingObject.id}/contracts/${doc.contract.id}?tab=execution-docs`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Пагинация */}
          {data.total > data.limit && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >Назад</Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                {page} / {Math.ceil(data.total / data.limit)}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage(p => p + 1)}
              >Вперёд</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ArchiveDocsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGlobalArchiveDocs(search, page);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени файла..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">Найдено: {data.total}</p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !data || data.data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Файлов не найдено</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {data.data.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{doc.fileName}</span>
                    {doc.certifiedCopy && (
                      <Badge variant="outline" className="text-xs">Копия верна</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.contract.buildingObject.name} → {doc.contract.number} {doc.contract.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {ARCHIVE_CATEGORY_LABELS[doc.category]}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(doc.createdAt)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`/objects/${doc.contract.buildingObject.id}/contracts/${doc.contract.id}?tab=archive`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {data.total > data.limit && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >Назад</Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                {page} / {Math.ceil(data.total / data.limit)}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage(p => p + 1)}
              >Вперёд</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function DocumentsPageContent() {
  return (
    <Tabs defaultValue="execution">
      <TabsList>
        <TabsTrigger value="execution">
          <FileText className="mr-1.5 h-4 w-4" />
          Исполнительная документация
        </TabsTrigger>
        <TabsTrigger value="archive">
          <Archive className="mr-1.5 h-4 w-4" />
          Документарий
        </TabsTrigger>
        <TabsTrigger value="templates" asChild>
          <Link href="/templates">Шаблоны →</Link>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="execution" className="mt-4">
        <ExecutionDocsTab />
      </TabsContent>

      <TabsContent value="archive" className="mt-4">
        <ArchiveDocsTab />
      </TabsContent>
    </Tabs>
  );
}
