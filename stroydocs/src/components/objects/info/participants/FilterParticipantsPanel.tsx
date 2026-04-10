'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PARTICIPANT_ROLES } from '@/lib/validations/participants';
import type { FilterState } from './types';

interface Props {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export function FilterParticipantsPanel({ filter, onFilterChange }: Props) {
  const hasActiveFilter = !!filter.search || !!filter.role;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Поиск по названию, ФИО, ИНН..."
        value={filter.search}
        onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        className="h-8 w-64 text-sm"
      />
      <Select
        value={filter.role || 'all'}
        onValueChange={(val) => onFilterChange({ ...filter, role: val === 'all' ? '' : val })}
      >
        <SelectTrigger className="h-8 w-48 text-sm">
          <SelectValue placeholder="Все роли" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все роли</SelectItem>
          {PARTICIPANT_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-sm text-muted-foreground"
          onClick={() => onFilterChange({ search: '', role: '' })}
        >
          Сбросить
        </Button>
      )}
    </div>
  );
}
