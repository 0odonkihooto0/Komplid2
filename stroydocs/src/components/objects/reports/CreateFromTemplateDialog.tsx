'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
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
import type {
  CategoryWithChildren,
  CreateFromTemplatePayload,
  ReportTemplate,
} from './useReportsList';

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithChildren[];
  onSubmit: (payload: CreateFromTemplatePayload) => void;
  isPending: boolean;
}

export function CreateFromTemplateDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
  isPending,
}: CreateFromTemplateDialogProps) {
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId ?? '';

  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Загрузка шаблонов организации
  const { data: templates = [], isLoading: templatesLoading } = useQuery<ReportTemplate[]>({
    queryKey: ['report-templates', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/report-templates`);
      const json = await res.json() as { success: boolean; data: ReportTemplate[] };
      if (!json.success) throw new Error('Ошибка загрузки шаблонов');
      return json.data;
    },
    enabled: !!orgId && open,
  });

  // Автозаполнение имени при выборе шаблона
  useEffect(() => {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl && !name) setName(tpl.name);
  }, [templateId, templates, name]);

  function resetForm() {
    setTemplateId('');
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
    if (!templateId || !name.trim()) return;

    const payload: CreateFromTemplatePayload = {
      templateId,
      name: name.trim(),
      ...(categoryId ? { categoryId } : {}),
      ...(periodStart ? { periodStart: new Date(periodStart).toISOString() } : {}),
      ...(periodEnd ? { periodEnd: new Date(periodEnd).toISOString() } : {}),
    };

    onSubmit(payload);
  }

  const flatCategories = flattenCategories(categories);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отчёт из шаблона</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Шаблон */}
          <div className="space-y-1.5">
            <Label htmlFor="template-select">
              Шаблон <span className="text-destructive">*</span>
            </Label>
            <Select
              value={templateId}
              onValueChange={(val) => {
                setTemplateId(val);
                // Сбросить имя при смене шаблона, чтобы автозаполнение сработало
                setName('');
              }}
              disabled={templatesLoading}
            >
              <SelectTrigger id="template-select">
                <SelectValue
                  placeholder={
                    templatesLoading ? 'Загрузка шаблонов...' : 'Выберите шаблон'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    <div className="flex items-center gap-2">
                      <span>{tpl.name}</span>
                      {tpl.isSystem && (
                        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                          системный
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {!templatesLoading && templates.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Нет доступных шаблонов
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="from-tpl-name">
              Наименование <span className="text-destructive">*</span>
            </Label>
            <Input
              id="from-tpl-name"
              placeholder="Наименование отчёта"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Категория */}
          <div className="space-y-1.5">
            <Label htmlFor="from-tpl-category">Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="from-tpl-category">
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
              <Label htmlFor="from-tpl-start">Начало периода</Label>
              <input
                id="from-tpl-start"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from-tpl-end">Конец периода</Label>
              <input
                id="from-tpl-end"
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
            disabled={!templateId || !name.trim() || isPending}
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
