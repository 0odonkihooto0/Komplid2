'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { KsActIndicator } from './useKsActForm';

interface Props {
  indicators: KsActIndicator[];
  onChange: (indicators: KsActIndicator[]) => void;
}

const EMPTY: KsActIndicator = { name: '', unit: '', designValue: '', actualValue: '' };

export function KsActIndicatorsSection({ indicators, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<KsActIndicator>(EMPTY);

  const handleAdd = () => {
    if (!form.name) return;
    onChange([...indicators, { ...form }]);
    setForm(EMPTY);
    setDialogOpen(false);
  };

  const handleRemove = (index: number) => {
    onChange(indicators.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Технические показатели (п.9)</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Добавить
        </Button>
      </div>

      {indicators.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование</TableHead>
              <TableHead>Ед. изм.</TableHead>
              <TableHead>По проекту</TableHead>
              <TableHead>Фактически</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicators.map((ind, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{ind.name}</TableCell>
                <TableCell className="text-sm">{ind.unit}</TableCell>
                <TableCell className="text-sm">{ind.designValue}</TableCell>
                <TableCell className="text-sm">{ind.actualValue}</TableCell>
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground py-2">Нет показателей. Нажмите «Добавить».</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить показатель</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Наименование <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Общая площадь" />
            </div>
            <div className="space-y-1.5">
              <Label>Единица измерения</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="м²" />
            </div>
            <div className="space-y-1.5">
              <Label>По проекту</Label>
              <Input value={form.designValue} onChange={(e) => setForm((f) => ({ ...f, designValue: e.target.value }))} placeholder="500" />
            </div>
            <div className="space-y-1.5">
              <Label>Фактически</Label>
              <Input value={form.actualValue} onChange={(e) => setForm((f) => ({ ...f, actualValue: e.target.value }))} placeholder="498" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAdd} disabled={!form.name}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
