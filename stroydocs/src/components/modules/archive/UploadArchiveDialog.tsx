'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ARCHIVE_CATEGORY_LABELS } from '@/utils/constants';
import { useArchive } from './useArchive';
import type { ArchiveCategory } from '@prisma/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  projectId: string;
}

export function UploadArchiveDialog({ open, onOpenChange, contractId, projectId }: Props) {
  const { uploadMutation } = useArchive(contractId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ArchiveCategory | ''>('');
  const [sheetNumber, setSheetNumber] = useState('');
  const [cipher, setCipher] = useState('');
  const [issueDate, setIssueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !category) return;

    uploadMutation.mutate(
      {
        file,
        category: category as ArchiveCategory,
        projectId,
        ...(sheetNumber && { sheetNumber }),
        ...(cipher && { cipher }),
        ...(issueDate && { issueDate }),
      },
      {
        onSuccess: () => {
          setCategory('');
          setSheetNumber('');
          setCipher('');
          setIssueDate('');
          if (fileRef.current) fileRef.current.value = '';
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузить документ в архив</DialogTitle>
          <DialogDescription className="sr-only">Загрузите документ в архив договора с указанием категории</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Категория *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ArchiveCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ARCHIVE_CATEGORY_LABELS) as [ArchiveCategory, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Файл *</Label>
            <Input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" />
          </div>

          {category === 'WORKING_PROJECT' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Номер листа</Label>
                <Input value={sheetNumber} onChange={(e) => setSheetNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Шифр</Label>
                <Input value={cipher} onChange={(e) => setCipher(e.target.value)} placeholder="АР-001" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Дата выдачи</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!category || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
