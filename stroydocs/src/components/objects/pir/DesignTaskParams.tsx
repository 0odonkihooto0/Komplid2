'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface DesignTaskParam {
  id: string;
  paramKey: string;
  paramName: string;
  value: string | null;
  order: number;
  hasComment: boolean;
}

interface Props {
  projectId: string;
  taskId: string;
  params: DesignTaskParam[];
  isEditable: boolean;
}

export function DesignTaskParams({ projectId, taskId, params, isEditable }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // ID параметра, который сейчас редактируется
  const [editingId, setEditingId] = useState<string | null>(null);
  // Текущее значение в редактируемом поле
  const [editingValue, setEditingValue] = useState('');

  const updateMutation = useMutation({
    mutationFn: async ({ paramId, value }: { paramId: string; value: string | null }) => {
      const res = await fetch(
        `/api/objects/${projectId}/design-tasks/${taskId}/params/${paramId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка сохранения параметра');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-task', taskId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  const startEdit = (param: DesignTaskParam) => {
    if (!isEditable) return;
    setEditingId(param.id);
    setEditingValue(param.value ?? '');
  };

  const commitEdit = (paramId: string) => {
    const param = params.find((p) => p.id === paramId);
    if (!param) return;
    const newValue = editingValue.trim() || null;
    if (newValue !== param.value) {
      updateMutation.mutate({ paramId, value: newValue });
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, paramId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(paramId);
    }
    if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  if (params.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Параметры не загружены
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="w-10 px-3 py-2.5 text-left font-medium text-muted-foreground">№</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Параметр</th>
            <th className="w-1/3 px-3 py-2.5 text-left font-medium text-muted-foreground">Значение</th>
          </tr>
        </thead>
        <tbody>
          {params.map((param) => (
            <tr
              key={param.id}
              className={cn(
                'border-b transition-colors last:border-0',
                isEditable && editingId !== param.id && 'hover:bg-muted/30'
              )}
            >
              <td className="px-3 py-2 text-muted-foreground">{param.order}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span>{param.paramName}</span>
                  {param.hasComment && (
                    <MessageSquare
                      className="h-3.5 w-3.5 flex-shrink-0 text-orange-500"
                      aria-label="Есть замечание к параметру"
                    />
                  )}
                </div>
              </td>
              <td
                className={cn(
                  'px-3 py-2',
                  isEditable && editingId !== param.id && 'cursor-pointer'
                )}
                onClick={() => editingId !== param.id && startEdit(param)}
              >
                {editingId === param.id ? (
                  <Input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => commitEdit(param.id)}
                    onKeyDown={(e) => handleKeyDown(e, param.id)}
                    className="h-7 py-0.5 text-sm"
                  />
                ) : (
                  <span
                    className={cn(
                      'block min-h-[1.5rem]',
                      !param.value && 'text-muted-foreground',
                      isEditable && 'rounded px-1 hover:bg-accent/40'
                    )}
                  >
                    {param.value ?? (isEditable ? 'Нажмите для редактирования' : '—')}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
