'use client';

import { useState, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import { useRequestItemStatuses, useCreateItemStatus } from './useRequestItemStatuses';

interface ItemStatusSelectProps {
  statusId: string | null;
  onChange: (statusId: string | null) => Promise<void> | void;
  disabled?: boolean;
}

// Значение-заглушка для «Без статуса» в Select (пустая строка не работает)
const NO_STATUS = '__none__';
// Значение для открытия поповера создания
const CREATE_NEW = '__create__';

export function ItemStatusSelect({ statusId, onChange, disabled }: ItemStatusSelectProps) {
  const { statuses } = useRequestItemStatuses();
  const createStatus = useCreateItemStatus();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSelectChange(value: string) {
    if (value === CREATE_NEW) {
      // Открываем поповер вместо смены значения
      setPopoverOpen(true);
      return;
    }
    await onChange(value === NO_STATUS ? null : value);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const created = await createStatus.mutateAsync({ name: newName.trim() });
    setNewName('');
    setPopoverOpen(false);
    await onChange(created.id);
  }

  const currentStatus = statuses.find((s) => s.id === statusId);

  return (
    <div className="flex items-center gap-1">
      <Select
        value={statusId ?? NO_STATUS}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 text-xs min-w-[120px] max-w-[160px]">
          <SelectValue>
            {currentStatus ? (
              <span className="flex items-center gap-1.5">
                {currentStatus.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: currentStatus.color }}
                  />
                )}
                {currentStatus.name}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_STATUS}>
            <span className="text-muted-foreground text-xs">Без статуса</span>
          </SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-1.5">
                {s.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                )}
                {s.name}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={CREATE_NEW}>
            <span className="flex items-center gap-1 text-blue-600 text-xs">
              <Plus className="h-3 w-3" />
              Создать статус
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Поповер создания нового статуса */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <span /> {/* невидимый триггер — управляется программно */}
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <p className="text-xs font-medium mb-2">Новый статус</p>
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название статуса"
            className="h-7 text-xs mb-2"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            autoFocus
          />
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || createStatus.isPending}
          >
            {createStatus.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
