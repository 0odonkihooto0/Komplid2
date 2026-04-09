'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, AlertTriangle, Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CreateDefectDialog } from '@/components/modules/defects/CreateDefectDialog';
import { RejectDefectDialog } from './RejectDefectDialog';
import { ExtendDeadlineDialog } from './ExtendDeadlineDialog';
import { useSkDefects } from './useSkDefects';
import type { DefectItem } from '@/components/modules/defects/useDefects';
import type { DefectStatus } from '@prisma/client';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён',
  REJECTED: 'Отклонён',
};

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-600',
};

function DefectStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface Props {
  objectId: string;
}

export function SkDefectsView({ objectId }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; defectId: string }>({
    open: false,
    defectId: '',
  });
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    defectId: string;
    currentDeadline: string | null;
  }>({ open: false, defectId: '', currentDeadline: null });

  const {
    defects,
    total,
    isLoading,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    overdueOnly,
    setOverdueOnly,
    deleteDefect,
    changeStatus,
    acceptDefect,
  } = useSkDefects(objectId);

  const now = new Date();
  const open = defects.filter((d) => d.status === 'OPEN').length;
  const inProgress = defects.filter((d) => d.status === 'IN_PROGRESS').length;
  const overdue = defects.filter(
    (d) =>
      d.deadline &&
      new Date(d.deadline) < now &&
      (d.status === 'OPEN' || d.status === 'IN_PROGRESS'),
  ).length;
  const confirmed = defects.filter((d) => d.status === 'CONFIRMED').length;

  function handleRowClick(defect: DefectItem) {
    router.push(`/objects/${objectId}/sk/defects/${defect.id}`);
  }

  return (
    <div className="space-y-5">
      {/* Кнопки действий */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Зафиксировать недостаток
        </Button>
      </div>

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Всего', value: total, icon: AlertTriangle, color: 'text-muted-foreground' },
          { label: 'Открыто', value: open + inProgress, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Просрочено', value: overdue, icon: Clock, color: 'text-orange-500' },
          { label: 'Подтверждено', value: confirmed, icon: CheckCircle2, color: 'text-green-600' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <kpi.icon className={`h-5 w-5 flex-shrink-0 ${kpi.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все статусы</SelectItem>
            <SelectItem value="OPEN">Открыт</SelectItem>
            <SelectItem value="IN_PROGRESS">В работе</SelectItem>
            <SelectItem value="RESOLVED">Устранён</SelectItem>
            <SelectItem value="CONFIRMED">Подтверждён</SelectItem>
            <SelectItem value="REJECTED">Отклонён</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все категории</SelectItem>
            <SelectItem value="QUALITY_VIOLATION">Нарушение ОТ</SelectItem>
            <SelectItem value="TECHNOLOGY_VIOLATION">Нарушение технологии</SelectItem>
            <SelectItem value="FIRE_SAFETY">Пожарная безопасность</SelectItem>
            <SelectItem value="ECOLOGY">Экология</SelectItem>
            <SelectItem value="DOCUMENTATION">Документация</SelectItem>
            <SelectItem value="OTHER">Прочее</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="overdue"
            checked={overdueOnly}
            onCheckedChange={(v) => setOverdueOnly(!!v)}
          />
          <Label htmlFor="overdue" className="cursor-pointer text-sm">
            Только просроченные
          </Label>
        </div>
      </div>

      {/* Таблица */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : defects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Недостатки не найдены.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Статус</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="w-36">Категория</TableHead>
                <TableHead className="w-36">Ответственный</TableHead>
                <TableHead className="w-28">Срок</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.map((defect) => {
                const isOverdue =
                  defect.deadline &&
                  new Date(defect.deadline) < now &&
                  defect.status !== 'CONFIRMED' &&
                  defect.status !== 'REJECTED';

                const deadlineFormatted = defect.deadline
                  ? new Date(defect.deadline).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })
                  : '—';

                const truncated =
                  defect.title.length > 60 ? defect.title.slice(0, 60) + '…' : defect.title;

                return (
                  <TableRow
                    key={defect.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(defect)}
                  >
                    <TableCell>
                      <DefectStatusBadge status={defect.status} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span title={defect.title}>{truncated}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[defect.category] ?? defect.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {defect.assignee
                        ? `${defect.assignee.lastName} ${defect.assignee.firstName.charAt(0)}.`
                        : '—'}
                    </TableCell>
                    <TableCell
                      className={`text-sm ${isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                    >
                      {deadlineFormatted}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {defect.status === 'RESOLVED' && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  acceptDefect.mutate({ defectId: defect.id })
                                }
                              >
                                ✓ Принять устранение
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setRejectDialog({ open: true, defectId: defect.id })
                                }
                              >
                                ↩ Вернуть на доработку
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {defect.status !== 'CONFIRMED' && defect.status !== 'REJECTED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                setExtendDialog({
                                  open: true,
                                  defectId: defect.id,
                                  currentDeadline: defect.deadline,
                                })
                              }
                            >
                              Продлить срок
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {defect.status !== 'IN_PROGRESS' && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeStatus.mutate({
                                  defectId: defect.id,
                                  status: 'IN_PROGRESS' as DefectStatus,
                                })
                              }
                            >
                              В работе
                            </DropdownMenuItem>
                          )}
                          {defect.status !== 'RESOLVED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeStatus.mutate({
                                  defectId: defect.id,
                                  status: 'RESOLVED' as DefectStatus,
                                })
                              }
                            >
                              Устранён
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm('Удалить недостаток?')) deleteDefect.mutate(defect.id);
                            }}
                          >
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateDefectDialog
        projectId={objectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <RejectDefectDialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
        projectId={objectId}
        defectId={rejectDialog.defectId}
      />

      <ExtendDeadlineDialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog((prev) => ({ ...prev, open }))}
        projectId={objectId}
        defectId={extendDialog.defectId}
        currentDeadline={extendDialog.currentDeadline}
      />
    </div>
  );
}
