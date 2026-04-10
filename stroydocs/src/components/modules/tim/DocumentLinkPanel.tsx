'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Unlink, ChevronDown, FileText, AlertTriangle, Navigation, PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useCreateLink,
  useDeleteLink,
  useSearchDocs,
  useSearchDefects,
} from './useModelViewer';
import type { BimElementLink } from './useModelViewer';
import { LinkSearchDialog } from './LinkSearchDialog';
import type { SearchDialogItem } from './LinkSearchDialog';
import { DefectCreateDialog } from './DefectCreateDialog';

interface Props {
  elementId: string;
  modelId: string;
  projectId: string;
  links: BimElementLink[];
  onFollowDoc: (entityType: string, entityId: string) => void;
}

/** Разворачиваемая секция без внешней зависимости */
function Section({
  label,
  count,
  defaultOpen = true,
  onAdd,
  children,
}: {
  label: string;
  count: number;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium"
          onClick={() => setOpen(v => !v)}
        >
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
          {label}
          {count > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">{count}</Badge>
          )}
        </button>
        {onAdd && (
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onAdd}>
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {open && <div className="pb-2 pl-5 pr-2">{children}</div>}
    </div>
  );
}

/** Одна строка привязанного документа/замечания */
function LinkRow({
  label,
  status,
  onFollow,
  onDelete,
  isPending,
}: {
  label: string;
  status?: string;
  onFollow: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded py-0.5">
      <span className="flex-1 truncate text-xs" title={label}>{label}</span>
      {status && <Badge variant="outline" className="shrink-0 text-[10px]">{status}</Badge>}
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground" onClick={onFollow}>
        <Navigation className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={isPending}
      >
        <Unlink className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function DocumentLinkPanel({ elementId, modelId, projectId, links, onFollowDoc }: Props) {
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [createDefectOpen, setCreateDefectOpen] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [defectSearch, setDefectSearch] = useState('');

  const createLink = useCreateLink(projectId);
  const deleteLink = useDeleteLink(projectId, modelId, elementId);

  const { data: docsData, isLoading: docsLoading } = useSearchDocs(
    projectId, docSearch, docDialogOpen
  );
  const { data: defectsRaw, isLoading: defectsLoading } = useSearchDefects(
    projectId, defectDialogOpen
  );

  // Разделяем привязки по типу
  const docLinks  = links.filter(l => l.entityType === 'ExecutionDoc' || l.entityType === 'Ks2Act');
  const defLinks  = links.filter(l => l.entityType === 'Defect');
  const docLinkedIds   = docLinks.map(l => l.entityId);
  const defectLinkedIds = defLinks.map(l => l.entityId);

  // Элементы для диалогов
  const docItems: SearchDialogItem[] = (docsData ?? []).map(d => ({
    id: d.id,
    label: [d.number, d.title].filter(Boolean).join(' ') || d.id.slice(0, 8),
    sublabel: d.entityType === 'Ks2Act' ? 'КС-2' : 'ИД',
    status: d.status,
  }));

  // Клиентская фильтрация замечаний по строке поиска
  const allDefects = defectsRaw?.data ?? [];
  const filteredDefects = defectSearch.trim()
    ? allDefects.filter(d =>
        d.title.toLowerCase().includes(defectSearch.toLowerCase()) ||
        (d.category ?? '').toLowerCase().includes(defectSearch.toLowerCase())
      )
    : allDefects;

  const defectItems: SearchDialogItem[] = filteredDefects.map(d => ({
    id: d.id,
    label: d.title,
    sublabel: d.category ?? undefined,
    status: d.status,
  }));

  function handleAddDocs(selectedIds: string[]) {
    const docsMap = new Map((docsData ?? []).map(d => [d.id, d]));
    const promises = selectedIds.flatMap(id => {
      const doc = docsMap.get(id);
      if (!doc) return [];
      return [createLink.mutateAsync({ elementId, modelId, entityType: doc.entityType, entityId: id })];
    });
    Promise.allSettled(promises).then(() => setDocDialogOpen(false));
  }

  function handleAddDefects(selectedIds: string[]) {
    const promises = selectedIds.map(id =>
      createLink.mutateAsync({ elementId, modelId, entityType: 'Defect', entityId: id })
    );
    Promise.allSettled(promises).then(() => setDefectDialogOpen(false));
  }

  return (
    <div className="divide-y rounded border text-xs">

      {/* Секция 1: Все документы */}
      <Section
        label="Все документы"
        count={docLinks.length}
        onAdd={() => setDocDialogOpen(true)}
      >
        {docLinks.length === 0 ? (
          <p className="py-1 text-muted-foreground">Нет привязок</p>
        ) : (
          <div className="space-y-0.5">
            {docLinks.map(link => (
              <LinkRow
                key={link.id}
                label={link.entityLabel ?? link.entityId.slice(0, 12) + '…'}
                status={link.entityStatus}
                onFollow={() => onFollowDoc(link.entityType, link.entityId)}
                onDelete={() => deleteLink.mutate(link.id)}
                isPending={deleteLink.isPending}
              />
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>ExecutionDoc · КС-2</span>
        </div>
      </Section>

      {/* Секция 2: Замечания СК */}
      <Section
        label="Замечания СК"
        count={defLinks.length}
        onAdd={() => setDefectDialogOpen(true)}
      >
        {defLinks.length === 0 ? (
          <p className="py-1 text-muted-foreground">Нет привязок</p>
        ) : (
          <div className="space-y-0.5">
            {defLinks.map(link => (
              <LinkRow
                key={link.id}
                label={link.entityLabel ?? link.entityId.slice(0, 12) + '…'}
                status={link.entityStatus}
                onFollow={() => onFollowDoc(link.entityType, link.entityId)}
                onDelete={() => deleteLink.mutate(link.id)}
                isPending={deleteLink.isPending}
              />
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-muted-foreground">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span>Дефекты строительного контроля</span>
        </div>
      </Section>

      {/* Секция 3: Замечания к элементу */}
      <Section label="Замечания к элементу" count={0} defaultOpen={false}>
        <div className="flex flex-col gap-1.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 justify-start gap-1.5 text-xs"
            onClick={() => setCreateDefectOpen(true)}
          >
            <PenSquare className="h-3 w-3" />
            Создать замечание
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 justify-start gap-1.5 text-xs"
            onClick={() => setDefectDialogOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Выбрать существующее
          </Button>
        </div>
      </Section>

      {/* Диалог: поиск документов */}
      <LinkSearchDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        title="Привязать документ"
        items={docItems}
        isLoading={docsLoading}
        search={docSearch}
        onSearchChange={setDocSearch}
        onConfirm={handleAddDocs}
        isPending={createLink.isPending}
        alreadyLinkedIds={docLinkedIds}
      />

      {/* Диалог: поиск замечаний */}
      <LinkSearchDialog
        open={defectDialogOpen}
        onOpenChange={setDefectDialogOpen}
        title="Привязать замечание СК"
        items={defectItems}
        isLoading={defectsLoading}
        search={defectSearch}
        onSearchChange={setDefectSearch}
        onConfirm={handleAddDefects}
        isPending={createLink.isPending}
        alreadyLinkedIds={defectLinkedIds}
      />

      {/* Диалог: создать замечание */}
      <DefectCreateDialog
        open={createDefectOpen}
        onOpenChange={setCreateDefectOpen}
        elementId={elementId}
        modelId={modelId}
        projectId={projectId}
      />
    </div>
  );
}
