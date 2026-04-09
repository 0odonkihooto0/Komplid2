'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CategoryWithChildren, CreateReportPayload } from './useReportsList';

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithChildren[];
  onSubmit: (payload: CreateReportPayload) => void;
  isPending: boolean;
}

export function CreateReportDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
  isPending,
}: CreateReportDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  function resetForm() {
    setName('');
    setCategoryId('');
    setPeriodStart('');
    setPeriodEnd('');
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function handleSubmit() {
    if (!name.trim()) return;

    const payload: CreateReportPayload = {
      name: name.trim(),
      ...(categoryId ? { categoryId } : {}),
      ...(periodStart ? { periodStart: new Date(periodStart).toISOString() } : {}),
      ...(periodEnd ? { periodEnd: new Date(periodEnd).toISOString() } : {}),
    };

    onSubmit(payload);
  }

  // Плоский список категорий для Select (обход дерева BFS)
  const flatCategories = flattenCategories(categories);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый отчёт</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="report-name">
              Наименование <span className="text-destructive">*</span>
            </Label>
            <Input
              id="report-name"
              placeholder="Например: Отчёт о ходе работ за 3-й квартал"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Категория */}
          <div className="space-y-1.5">
            <Label htmlFor="report-category">Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="report-category">
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                {flatCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.indent}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Период */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period-start">Начало периода</Label>
              <input
                id="period-start"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">Конец периода</Label>
              <input
                id="period-end"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Утилита: плоский список из дерева ────────────────────────────────────────

type FlatCategory = { id: string; name: string; indent: string };

function flattenCategories(
  nodes: CategoryWithChildren[],
  depth = 0,
): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, indent: '  '.repeat(depth) });
    if (node.children.length > 0) {
      result.push(...flattenCategories(node.children, depth + 1));
    }
  }
  return result;
}
