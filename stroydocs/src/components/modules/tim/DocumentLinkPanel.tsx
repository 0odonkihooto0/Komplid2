'use client';

import { useState } from 'react';
import { Plus, Unlink, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreateLink, useDeleteLink } from './useModelViewer';
import type { BimElementLink } from './useModelViewer';

interface Props {
  elementId: string;
  modelId: string;
  projectId: string;
  links: BimElementLink[];
}

type EntityType = 'ExecutionDoc' | 'Defect';

function LinkSection({
  title,
  icon,
  entityType,
  links,
  elementId,
  modelId,
  projectId,
}: {
  title: string;
  icon: React.ReactNode;
  entityType: EntityType;
  links: BimElementLink[];
  elementId: string;
  modelId: string;
  projectId: string;
}) {
  const [addMode, setAddMode] = useState(false);
  const [entityId, setEntityId] = useState('');
  const createLink = useCreateLink(projectId);
  const deleteLink = useDeleteLink(projectId, modelId, elementId);

  function handleAdd() {
    if (!entityId.trim()) return;
    createLink.mutate(
      { elementId, modelId, entityType, entityId: entityId.trim() },
      { onSuccess: () => { setAddMode(false); setEntityId(''); } }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium">
          {icon}
          {title}
        </div>
        <Button variant="ghost" size="sm" className="h-5 gap-1 text-xs" onClick={() => setAddMode(v => !v)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {addMode && (
        <div className="flex gap-2">
          <input
            className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs"
            placeholder="ID документа (UUID)"
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={createLink.isPending}>
            OK
          </Button>
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-1">Нет привязок</p>
      ) : (
        <ul className="space-y-1">
          {links.map(link => (
            <li key={link.id} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
              <span className="truncate text-xs font-mono">{link.entityId.slice(0, 12)}…</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive hover:text-destructive"
                onClick={() => deleteLink.mutate(link.id)}
                disabled={deleteLink.isPending}
              >
                <Unlink className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DocumentLinkPanel({ elementId, modelId, projectId, links }: Props) {
  const execLinks = links.filter(l => l.entityType === 'ExecutionDoc');
  const defectLinks = links.filter(l => l.entityType === 'Defect');

  return (
    <div className="space-y-4">
      <LinkSection
        title="Исполнительная документация"
        icon={<FileText className="h-3 w-3" />}
        entityType="ExecutionDoc"
        links={execLinks}
        elementId={elementId}
        modelId={modelId}
        projectId={projectId}
      />
      <div className="border-t" />
      <LinkSection
        title="Замечания СК"
        icon={<AlertTriangle className="h-3 w-3 text-amber-500" />}
        entityType="Defect"
        links={defectLinks}
        elementId={elementId}
        modelId={modelId}
        projectId={projectId}
      />
    </div>
  );
}
