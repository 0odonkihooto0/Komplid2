'use client';

import { useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { KsActParticipant } from './useKsActForm';

interface Props {
  participants: KsActParticipant[];
  onChange: (participants: KsActParticipant[]) => void;
  onAutofill?: () => void;
  isAutofilling?: boolean;
}

const EMPTY: KsActParticipant = { role: '', orgName: '', inn: '', representative: '', position: '', order: '' };

export function KsActParticipantsSection({ participants, onChange, onAutofill, isAutofilling }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<KsActParticipant>(EMPTY);

  const handleAdd = () => {
    if (!form.role || !form.orgName) return;
    onChange([...participants, { ...form }]);
    setForm(EMPTY);
    setDialogOpen(false);
  };

  const handleRemove = (index: number) => {
    onChange(participants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Участники строительства (п.13)</span>
        <div className="flex gap-2">
          {onAutofill && (
            <Button type="button" variant="outline" size="sm" onClick={onAutofill} disabled={isAutofilling}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Автозаполнить
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Добавить
          </Button>
        </div>
      </div>

      {participants.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Роль</TableHead>
              <TableHead>Организация</TableHead>
              <TableHead>ИНН</TableHead>
              <TableHead>Представитель</TableHead>
              <TableHead>Приказ №</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{p.role}</TableCell>
                <TableCell className="text-sm">{p.orgName}</TableCell>
                <TableCell className="text-sm">{p.inn}</TableCell>
                <TableCell className="text-sm">{p.representative}</TableCell>
                <TableCell className="text-sm">{p.order}</TableCell>
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
        <p className="text-sm text-muted-foreground py-2">Нет участников. Нажмите «Добавить» или «Автозаполнить».</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Роль <span className="text-destructive">*</span></Label>
              <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Застройщик, Подрядчик..." />
            </div>
            <div className="space-y-1.5">
              <Label>Организация <span className="text-destructive">*</span></Label>
              <Input value={form.orgName} onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))} placeholder="Наименование организации" />
            </div>
            <div className="space-y-1.5">
              <Label>ИНН</Label>
              <Input value={form.inn} onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))} placeholder="7701234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Представитель (ФИО)</Label>
              <Input value={form.representative} onChange={(e) => setForm((f) => ({ ...f, representative: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Должность</Label>
              <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Приказ №</Label>
              <Input value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} placeholder="123-к от 01.01.2026" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAdd} disabled={!form.role || !form.orgName}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
