'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import type { ReferenceSchema } from '@/lib/references/types';

interface Props {
  schema: ReferenceSchema;
  entry: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

function formatValue(value: unknown, type: string, options?: { value: string; label: string }[]): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'boolean') return value ? 'Да' : 'Нет';
  if (type === 'date' && typeof value === 'string') {
    try { return new Date(value).toLocaleDateString('ru-RU'); } catch { return String(value); }
  }
  if (type === 'select' && options) {
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }
  return String(value);
}

export function ReferenceInfoDialog({ schema, entry, open, onOpenChange, onEdit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schema.name} — Информация</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {schema.fields.map((f) => (
            <div key={f.key}>
              <dt className="text-muted-foreground font-medium">{f.label}</dt>
              <dd className="mt-0.5">
                {f.type === 'color' && typeof entry[f.key] === 'string' ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded border" style={{ background: entry[f.key] as string }} />
                    {entry[f.key] as string}
                  </span>
                ) : (
                  formatValue(entry[f.key], f.type, f.options)
                )}
              </dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
          <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-1" />Редактировать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
