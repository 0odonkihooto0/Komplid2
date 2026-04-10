'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { APPOINTMENT_DOC_TYPE_LABELS } from '@/lib/validations/participants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  onSubmit: (personId: string, formData: FormData) => Promise<void>;
  isPending: boolean;
}

export function AddAppointmentDialog({ open, onOpenChange, personId, onSubmit, isPending }: Props) {
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    onOpenChange(false);
    setDocumentType(''); setDocumentNumber(''); setStartDate(''); setEndDate('');
    setIsActive(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentType) return;

    const fd = new FormData();
    fd.append('documentType', documentType);
    if (documentNumber) fd.append('documentNumber', documentNumber);
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    fd.append('isActive', isActive ? 'true' : 'false');
    const file = fileRef.current?.files?.[0];
    if (file) fd.append('file', file);

    await onSubmit(personId, fd);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Документ о назначении</DialogTitle>
          <DialogDescription className="sr-only">
            Добавить документ о назначении физического лица
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Тип документа *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPOINTMENT_DOC_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Номер документа</Label>
            <Input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Например: 42"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Дата начала</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Дата окончания</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
            />
            <Label htmlFor="isActive" className="text-sm cursor-pointer">Актуальный</Label>
          </div>
          <div>
            <Label className="text-xs">Прикрепить файл</Label>
            <input ref={fileRef} type="file" className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-primary-foreground" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose}>Отмена</Button>
            <Button type="submit" disabled={!documentType || isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
