'use client';

import { useState } from 'react';
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
import { EXECUTION_DOC_TYPE_LABELS } from '@/utils/constants';
import { useExecutionDocs } from './useExecutionDocs';
import { useWorkRecords } from '@/components/modules/work-records/useWorkRecords';
import type { ExecutionDocType } from '@prisma/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export function CreateExecutionDocDialog({ open, onOpenChange, contractId }: Props) {
  const { createMutation } = useExecutionDocs(contractId);
  const { records } = useWorkRecords(contractId);

  const [type, setType] = useState<ExecutionDocType | ''>('');
  const [workRecordId, setWorkRecordId] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;

    createMutation.mutate(
      {
        type: type as ExecutionDocType,
        ...(workRecordId && { workRecordId }),
        ...(title && { title }),
      },
      {
        onSuccess: () => {
          setType('');
          setWorkRecordId('');
          setTitle('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать исполнительный документ</DialogTitle>
          <DialogDescription className="sr-only">Выберите тип и параметры нового исполнительного документа</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Тип документа *</Label>
            <Select value={type} onValueChange={(v) => setType(v as ExecutionDocType)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(EXECUTION_DOC_TYPE_LABELS) as [ExecutionDocType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {type === 'AOSR' && (
            <div className="space-y-2">
              <Label>Запись о работе *</Label>
              <Select value={workRecordId} onValueChange={setWorkRecordId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите запись" />
                </SelectTrigger>
                <SelectContent>
                  {records.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.workItem.name} — {r.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Заголовок (необязательно)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Автоматически по типу и работе"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!type || createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
