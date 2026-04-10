'use client';

import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SEDDocumentFull, SEDLink } from './useSEDDocumentCard';
import { AddSEDLinkDialog } from './AddSEDLinkDialog';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  SEDDocument:  'СЭД-документ',
  Contract:     'Договор',
  ExecutionDoc: 'Исп. документ',
  DesignDoc:    'ПИР-документ',
  DesignTask:   'Задание ПИР',
};

interface SEDLinksTabProps {
  doc: SEDDocumentFull;
  objectId: string;
  docId: string;
  addLinkMutation: UseMutationResult<unknown, Error, { entityType: string; entityId: string }>;
}

export function SEDLinksTab({ doc, objectId: _objectId, docId: _docId, addLinkMutation }: SEDLinksTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Связанные объекты</h3>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          + Добавить
        </Button>
      </div>

      {doc.links.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border rounded-md">
          Нет связанных объектов
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Тип объекта</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Идентификатор</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Добавлено</th>
              </tr>
            </thead>
            <tbody>
              {doc.links.map((link: SEDLink) => (
                <tr key={link.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <Badge variant="secondary">
                      {ENTITY_TYPE_LABELS[link.entityType] ?? link.entityType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {link.entityId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(link.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddSEDLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        addLinkMutation={addLinkMutation}
      />
    </div>
  );
}
