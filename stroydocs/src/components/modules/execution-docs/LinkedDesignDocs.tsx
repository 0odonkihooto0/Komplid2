'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DesignDocBrief {
  id: string;
  number: string;
  name: string;
  version: number;
  docType: string;
}

interface ApiListResponse {
  data: DesignDocBrief[];
  total: number;
}

interface Props {
  projectId: string;
  docId: string; // ID текущего ExecutionDoc (АОСР)
}

// Загрузить ПИР-документы, привязанные к данному АОСР
async function fetchLinkedDocs(projectId: string, execDocId: string): Promise<DesignDocBrief[]> {
  const res = await fetch(
    `/api/projects/${projectId}/design-docs?linkedTo=${execDocId}&limit=50`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error('Ошибка загрузки связанных чертежей');
  const json: { data: ApiListResponse } = await res.json();
  return json.data.data;
}

// Загрузить все ПИР-документы проекта для выбора
async function fetchAllDesignDocs(projectId: string): Promise<DesignDocBrief[]> {
  const res = await fetch(
    `/api/projects/${projectId}/design-docs?limit=200`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error('Ошибка загрузки документов ПИР');
  const json: { data: ApiListResponse } = await res.json();
  return json.data.data;
}

// Привязать ПИР-документ к АОСР
async function linkDesignDoc(
  projectId: string,
  designDocId: string,
  execDocId: string
): Promise<void> {
  const res = await fetch(
    `/api/projects/${projectId}/design-docs/${designDocId}/link-exec-doc`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionDocId: execDocId }),
    }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? 'Ошибка привязки чертежа');
  }
}

export function LinkedDesignDocs({ projectId, docId }: Props) {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const linkedQuery = useQuery<DesignDocBrief[]>({
    queryKey: ['linked-design-docs', projectId, docId],
    queryFn: () => fetchLinkedDocs(projectId, docId),
  });

  const allDocsQuery = useQuery<DesignDocBrief[]>({
    queryKey: ['all-design-docs', projectId],
    queryFn: () => fetchAllDesignDocs(projectId),
    enabled: popoverOpen,
  });

  const linkMutation = useMutation({
    mutationFn: (designDocId: string) => linkDesignDoc(projectId, designDocId, docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['linked-design-docs', projectId, docId] });
      setLinkingId(null);
    },
    onError: () => {
      setLinkingId(null);
    },
  });

  const linkedDocs = linkedQuery.data ?? [];
  const linkedIds = new Set(linkedDocs.map((d: DesignDocBrief) => d.id));

  const filtered = (allDocsQuery.data ?? []).filter((d: DesignDocBrief) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.number.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
  });

  function handleSelect(designDocId: string) {
    if (linkedIds.has(designDocId) || linkMutation.isPending) return;
    setLinkingId(designDocId);
    linkMutation.mutate(designDocId);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Связанные чертежи ПД
          {linkedDocs.length > 0 && (
            <Badge variant="secondary" className="ml-1">{linkedDocs.length}</Badge>
          )}
        </h3>

        <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); setSearch(''); }}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Link2 className="h-3 w-3" />
              Привязать чертёж
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="end">
            <Input
              placeholder="Поиск по шифру или названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-8 text-sm"
            />
            <ScrollArea className="h-60">
              {allDocsQuery.isLoading && (
                <p className="py-4 text-center text-xs text-muted-foreground">Загрузка...</p>
              )}
              {!allDocsQuery.isLoading && filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Документы не найдены</p>
              )}
              {filtered.map((doc: DesignDocBrief) => {
                const isLinked = linkedIds.has(doc.id);
                const isLinking = linkingId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelect(doc.id)}
                    disabled={isLinked || linkMutation.isPending}
                    className={cn(
                      'flex w-full items-start gap-2 rounded px-2 py-2 text-left transition-colors',
                      isLinked
                        ? 'cursor-default opacity-60'
                        : 'cursor-pointer hover:bg-muted/60',
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 text-green-500',
                        isLinked ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-muted-foreground">{doc.number}</p>
                      <p className="truncate text-sm leading-tight">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">v{doc.version} · {doc.docType}</p>
                    </div>
                    {isLinking && (
                      <span className="shrink-0 text-xs text-muted-foreground">...</span>
                    )}
                  </button>
                );
              })}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {linkedQuery.isLoading && <Skeleton className="h-16 w-full" />}

      {!linkedQuery.isLoading && linkedDocs.length === 0 && (
        <p className="text-xs text-muted-foreground">Чертежи ПД не привязаны</p>
      )}

      {linkedDocs.map((doc: DesignDocBrief) => (
        <div
          key={doc.id}
          className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5"
        >
          <p className="font-mono text-xs text-muted-foreground">{doc.number}</p>
          <p className="text-sm leading-snug">{doc.name}</p>
          <p className="text-xs text-muted-foreground">Версия {doc.version}</p>
        </div>
      ))}
    </div>
  );
}
