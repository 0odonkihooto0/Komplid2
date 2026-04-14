'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { KsActWorkItem } from './useKsActForm';

interface Props {
  workList: KsActWorkItem[];
  onChange: (workList: KsActWorkItem[]) => void;
}

const EMPTY: KsActWorkItem = { name: '', unit: '', volume: '', note: '' };

export function KsActWorkListSection({ workList, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<KsActWorkItem>(EMPTY);

  const handleAdd = () => {
    if (!form.name) return;
    onChange([...workList, { ...form }]);
    setForm(EMPTY);
    setDialogOpen(false);
  };

  const handleRemove = (index: number) => {
    onChange(workList.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Перечень выполненных работ (п.10)</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Добавить
        </Button>
      </div>

      {workList.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование работ</TableHead>
              <TableHead>Ед. изм.</TableHead>
              <TableHead>Объём</TableHead>
              <TableHead>Примечание</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {workList.map((w, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{w.name}</TableCell>
                <TableCell className="text-sm">{w.unit}</TableCell>
                <TableCell className="text-sm">{w.volume}</TableCell>
                <TableCell className="text-sm">{w.note}</TableCell>
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
        <p className="text-sm text-muted-foreground py-2">Нет записей. Нажмите «Добавить».</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить работу</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Наименование работ <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Устройство фундамента" />
            </div>
            <div className="space-y-1.5">
              <Label>Единица измерения</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="м³" />
            </div>
            <div className="space-y-1.5">
              <Label>Объём</Label>
              <Input value={form.volume} onChange={(e) => setForm((f) => ({ ...f, volume: e.target.value }))} placeholder="150" />
            </div>
            <div className="space-y-1.5">
              <Label>Примечание</Label>
              <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={2} />
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
