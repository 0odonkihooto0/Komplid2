'use client';

import { useState } from 'react';
import { Link2, Unlink, Plus } from 'lucide-react';
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

export function GprLinkPanel({ elementId, modelId, projectId, links }: Props) {
  const [addMode, setAddMode] = useState(false);
  const [entityId, setEntityId] = useState('');

  const createLink = useCreateLink(projectId);
  const deleteLink = useDeleteLink(projectId, modelId, elementId);

  const gprLinks = links.filter(l => l.entityType === 'GanttTask');

  function handleAdd() {
    if (!entityId.trim()) return;
    createLink.mutate(
      { elementId, modelId, entityType: 'GanttTask', entityId: entityId.trim() },
      { onSuccess: () => { setAddMode(false); setEntityId(''); } }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Привязки к позициям ГПР</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-xs"
          onClick={() => setAddMode(v => !v)}
        >
          <Plus className="h-3 w-3" />
          Привязать
        </Button>
      </div>

      {addMode && (
        <div className="flex gap-2">
          <input
            className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs"
            placeholder="ID позиции ГПР"
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={createLink.isPending}>
            <Link2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {gprLinks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Нет привязок к ГПР</p>
      ) : (
        <ul className="space-y-1">
          {gprLinks.map(link => (
            <li key={link.id} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">ГПР</Badge>
                <span className="truncate text-xs font-mono">{link.entityId.slice(0, 8)}…</span>
              </div>
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
