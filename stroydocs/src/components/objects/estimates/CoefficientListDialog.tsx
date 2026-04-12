'use client';

import { MoreHorizontal, Info, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import type { EstimateCoefficientDetail } from '@/hooks/useEstimateTree';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coefficients: EstimateCoefficientDetail[];
  objectId: string;
  contractId: string;
  versionId: string;
}

/** Диалог списка коэффициентов версии сметы */
export function CoefficientListDialog({
  open,
  onOpenChange,
  coefficients,
  objectId,
  contractId,
  versionId,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const basePath = `/api/projects/${objectId}/contracts/${contractId}/estimate-versions/${versionId}/coefficients`;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['estimate-version', versionId] });
  };

  // Переключение isEnabled
  const toggleEnabled = useMutation({
    mutationFn: async ({ coefId, isEnabled }: { coefId: string; isEnabled: boolean }) => {
      const res = await fetch(`${basePath}/${coefId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
    },
    onSuccess: (_data, vars) => {
      toast({ title: vars.isEnabled ? 'Коэффициент включён' : 'Коэффициент отключён' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удаление коэффициента
  const deleteCoef = useMutation({
    mutationFn: async (coefId: string) => {
      const res = await fetch(`${basePath}/${coefId}`, { method: 'DELETE' });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      toast({ title: 'Коэффициент удалён' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const handleDelete = (c: EstimateCoefficientDetail) => {
    if (confirm(`Удалить коэффициент «${c.name}»?`)) {
      deleteCoef.mutate(c.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Коэффициенты пересчёта</DialogTitle>
        </DialogHeader>

        {coefficients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет коэффициентов для этой версии
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Применение</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead className="w-[100px]">Код</TableHead>
                  <TableHead className="w-[90px]">Значение</TableHead>
                  <TableHead className="w-[90px]">Статус</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {coefficients.map((c) => (
                  <TableRow
                    key={c.id}
                    className={c.isEnabled ? '' : 'bg-red-50'}
                  >
                    <TableCell className="text-sm">{c.application ?? '—'}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.code ?? '—'}</TableCell>
                    <TableCell className="tabular-nums font-medium">{c.value}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.isEnabled ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {c.isEnabled ? 'Включён' : 'Отключён'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => toggleEnabled.mutate({
                              coefId: c.id,
                              isEnabled: !c.isEnabled,
                            })}
                          >
                            {c.isEnabled
                              ? <><ToggleLeft className="mr-2 h-4 w-4" /> Отключить</>
                              : <><ToggleRight className="mr-2 h-4 w-4" /> Включить</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Info className="mr-2 h-4 w-4" /> Информация
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Pencil className="mr-2 h-4 w-4" /> Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
