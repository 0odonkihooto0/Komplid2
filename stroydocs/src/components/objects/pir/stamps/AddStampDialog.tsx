'use client';

import { Stamp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useAddStamp } from './useAddStamp';

interface AddStampDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objectId: string;
  docId: string;
  s3Key: string;
  orgId: string;
}

export function AddStampDialog({
  open,
  onOpenChange,
  objectId,
  docId,
  s3Key,
  orgId,
}: AddStampDialogProps) {
  const {
    stampTitles,
    titlesLoading,
    titleId,
    setTitleId,
    newTitleName,
    setNewTitleName,
    showNewTitle,
    setShowNewTitle,
    stampText,
    setStampText,
    page,
    setPage,
    createTitleMutation,
    isSubmitting,
    submitStamp,
    canSubmit,
  } = useAddStamp({
    objectId,
    docId,
    s3Key,
    orgId,
    onSuccess: () => onOpenChange(false),
  });

  /** Обработка выбора значения в Select: __none__ → свободный текст */
  function handleTitleSelect(value: string) {
    if (value === '__none__') {
      setTitleId(null);
    } else {
      setTitleId(value);
    }
  }

  /** Отправка формы: штамп позиционируется по умолчанию в левый верхний угол */
  function handleSubmit() {
    submitStamp();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="h-5 w-5" />
            Добавить штамп
          </DialogTitle>
          <DialogDescription>
            Выберите титул или введите произвольный текст для штампа.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Выбор титула штампа */}
          <div className="flex flex-col gap-1.5">
            <Label>Титул штампа</Label>
            <Select
              value={titleId ?? '__none__'}
              onValueChange={handleTitleSelect}
              disabled={titlesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите титул штампа" />
              </SelectTrigger>
              <SelectContent>
                {stampTitles.map((title) => (
                  <SelectItem key={title.id} value={title.id}>
                    {title.name}
                  </SelectItem>
                ))}
                <SelectItem value="__none__">Без титула (произвольный текст)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Строка создания нового титула */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit text-sm text-muted-foreground"
              onClick={() => setShowNewTitle(!showNewTitle)}
            >
              ＋ Создать новый
            </Button>

            {showNewTitle && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Название титула"
                  value={newTitleName}
                  onChange={(e) => setNewTitleName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!newTitleName.trim() || createTitleMutation.isPending}
                  onClick={() => createTitleMutation.mutate(newTitleName.trim())}
                >
                  Создать
                </Button>
              </div>
            )}
          </div>

          {/* Поле произвольного текста — только в режиме без титула */}
          {titleId === null && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stamp-text">Текст штампа</Label>
              <Input
                id="stamp-text"
                placeholder="Текст который будет отображаться на штампе"
                value={stampText}
                onChange={(e) => setStampText(e.target.value)}
              />
            </div>
          )}

          {/* Номер страницы */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stamp-page">Страница</Label>
            <Input
              id="stamp-page"
              type="number"
              min={1}
              value={page}
              onChange={(e) => setPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              Штамп будет позиционирован в левый верхний угол. Позицию можно изменить в предпросмотре.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
