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
import type { KsActCommissionMember } from './useKsActForm';

interface Props {
  members: KsActCommissionMember[];
  onChange: (members: KsActCommissionMember[]) => void;
}

const EMPTY: KsActCommissionMember = { name: '', position: '', role: '', orgName: '' };

export function KsActCommissionSection({ members, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<KsActCommissionMember>(EMPTY);

  const handleAdd = () => {
    if (!form.name) return;
    onChange([...members, { ...form }]);
    setForm(EMPTY);
    setDialogOpen(false);
  };

  const handleRemove = (index: number) => {
    onChange(members.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Состав приёмочной комиссии</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Добавить
        </Button>
      </div>

      {members.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Роль в комиссии</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Должность</TableHead>
              <TableHead>Организация</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{m.role}</TableCell>
                <TableCell className="text-sm">{m.name}</TableCell>
                <TableCell className="text-sm">{m.position}</TableCell>
                <TableCell className="text-sm">{m.orgName}</TableCell>
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
        <p className="text-sm text-muted-foreground py-2">Нет членов комиссии. Нажмите «Добавить».</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить члена комиссии</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ФИО <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Иванов Иван Иванович" />
            </div>
            <div className="space-y-1.5">
              <Label>Роль в комиссии</Label>
              <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Председатель, Член комиссии..." />
            </div>
            <div className="space-y-1.5">
              <Label>Должность</Label>
              <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="Главный инженер" />
            </div>
            <div className="space-y-1.5">
              <Label>Организация</Label>
              <Input value={form.orgName} onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))} placeholder="ООО Застройщик" />
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
