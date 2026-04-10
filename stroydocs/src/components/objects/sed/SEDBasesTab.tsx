'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SEDDocumentFull, SEDWorkflowItem } from './useSEDDocumentCard';

interface SEDBasesTabProps {
  doc: SEDDocumentFull;
}

export function SEDBasesTab({ doc }: SEDBasesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Документы-основания</h3>
        <Button
          size="sm"
          variant="outline"
          disabled
          title="Добавление оснований доступно в карточке документооборота"
        >
          + Добавить Документ СЭД
        </Button>
      </div>

      {doc.workflows.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border rounded-md">
          Нет документов-оснований. Добавление оснований доступно через карточку документооборота.
        </div>
      ) : (
        <div className="space-y-2">
          {doc.workflows.map((wf: SEDWorkflowItem) => (
            <div key={wf.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">ДО № {wf.number}</span>
                <Badge variant="outline" className="text-xs">{wf.workflowType}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ID: <span className="font-mono">{wf.id.slice(0, 8)}…</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
