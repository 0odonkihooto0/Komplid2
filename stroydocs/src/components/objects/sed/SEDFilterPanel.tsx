'use client';

import { useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { type SEDDocType, type SEDStatus, type SEDFilters, EMPTY_FILTERS } from './useSEDList';

const DOC_TYPE_LABELS: Record<SEDDocType, string> = {
  LETTER: 'Письмо',
  ORDER: 'Приказ',
  PROTOCOL: 'Протокол',
  ACT: 'Акт',
  MEMO: 'Докладная',
  NOTIFICATION: 'Уведомление',
  OTHER: 'Иное',
};

const STATUS_LABELS: Record<SEDStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  IN_APPROVAL: 'На согласовании',
  REQUIRES_ACTION: 'Требует действия',
  APPROVED: 'Согласован',
  REJECTED: 'Отклонён',
  ARCHIVED: 'Архив',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SEDFilters;
  onApply: (filters: SEDFilters) => void;
}

export function SEDFilterPanel({ open, onOpenChange, filters, onApply }: Props) {
  const [local, setLocal] = useState<SEDFilters>(filters);

  const handleApply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocal(EMPTY_FILTERS);
    onApply(EMPTY_FILTERS);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Фильтры</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto py-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Тип документа</Label>
            <Select
              value={local.docType ?? '_all'}
              onValueChange={(v) =>
                setLocal((p) => ({
                  ...p,
                  docType: v === '_all' ? null : (v as SEDDocType),
                }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Все типы</SelectItem>
                {(Object.keys(DOC_TYPE_LABELS) as SEDDocType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {DOC_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Статус</Label>
            <Select
              value={local.status ?? '_all'}
              onValueChange={(v) =>
                setLocal((p) => ({
                  ...p,
                  status: v === '_all' ? null : (v as SEDStatus),
                }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Все статусы</SelectItem>
                {(Object.keys(STATUS_LABELS) as SEDStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STATUS_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Организация-отправитель</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Название организации..."
              value={local.senderOrg}
              onChange={(e) => setLocal((p) => ({ ...p, senderOrg: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Организация-получатель</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Название организации..."
              value={local.receiverOrg}
              onChange={(e) => setLocal((p) => ({ ...p, receiverOrg: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Период документа</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                className="h-8 text-sm flex-1"
                value={local.dateFrom}
                onChange={(e) => setLocal((p) => ({ ...p, dateFrom: e.target.value }))}
              />
              <Input
                type="date"
                className="h-8 text-sm flex-1"
                value={local.dateTo}
                onChange={(e) => setLocal((p) => ({ ...p, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t pt-4 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            Сбросить
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Применить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
