'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import type { ContractCategory } from './useManagementContracts';

interface Props {
  categories: ContractCategory[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
  totalCount: number;
  countByCategory: Map<string, number>;
}

export function ContractCategorySidebar({
  categories,
  activeCategoryId,
  onSelect,
  totalCount,
  countByCategory,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/contract-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-categories'] });
      setAdding(false);
      setNewName('');
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (catId: string) => {
      const res = await fetch(`/api/contract-categories/${catId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-categories'] });
      // Если удалили активную категорию — сбросить фильтр
      if (activeCategoryId) onSelect(null);
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  function handleAddConfirm() {
    const name = newName.trim();
    if (name) createMutation.mutate(name);
  }

  return (
    <div className="w-56 flex-shrink-0 space-y-1">
      <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Категории
      </p>

      {/* «Все» — без фильтра */}
      <button
        onClick={() => onSelect(null)}
        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
          activeCategoryId === null ? 'bg-muted font-medium' : ''
        }`}
      >
        <span>Все</span>
        <span className="text-xs text-muted-foreground">{totalCount}</span>
      </button>

      {/* Список категорий */}
      {categories.map((cat) => (
        <div key={cat.id} className="group flex items-center gap-1">
          <button
            onClick={() => onSelect(cat.id)}
            className={`flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
              activeCategoryId === cat.id ? 'bg-muted font-medium' : ''
            }`}
          >
            <span className="truncate">{cat.name}</span>
            <span className="text-xs text-muted-foreground">{countByCategory.get(cat.id) ?? 0}</span>
          </button>
          <button
            onClick={() => deleteMutation.mutate(cat.id)}
            className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
            aria-label="Удалить категорию"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Inline добавление категории */}
      {adding ? (
        <div className="space-y-1 px-1">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddConfirm();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            placeholder="Название категории"
            className="h-7 text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-xs" onClick={handleAddConfirm} disabled={createMutation.isPending}>
              Добавить
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setAdding(false); setNewName(''); }}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить категорию
        </button>
      )}
    </div>
  );
}
