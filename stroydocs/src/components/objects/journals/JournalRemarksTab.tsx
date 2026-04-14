'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useJournalRemarks } from './useJournalRemarks';
import { REMARK_STATUS_LABELS } from './journal-constants';
import type { JournalDetail } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
  journal: JournalDetail;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  IN_PROGRESS: 'secondary',
  RESOLVED: 'outline',
};

function userName(u: { firstName: string | null; lastName: string | null } | null) {
  if (!u) return '—';
  return [u.lastName, u.firstName].filter(Boolean).join(' ') || '—';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return format(new Date(d), 'd MMM yyyy', { locale: ru });
}

export function JournalRemarksTab({ objectId, journalId, journal }: Props) {
  const vm = useJournalRemarks(objectId, journalId);
  const [newText, setNewText] = useState('');
  const [replyText, setReplyText] = useState('');

  const responsible = journal.responsible;

  const handleCreate = () => {
    if (!newText.trim()) return;
    vm.createRemark({ text: newText.trim() });
    setNewText('');
  };

  const handleAddReply = () => {
    if (!replyText.trim()) return;
    vm.addReply({ text: replyText.trim() });
    setReplyText('');
  };

  return (
    <div className="space-y-4 pt-4">
      {/* Форма добавления замечания */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Текст замечания..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          rows={2}
          className="flex-1 resize-none"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!newText.trim() || vm.isCreating}
          className="self-end"
        >
          <Plus className="mr-1 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Таблица замечаний */}
      {vm.isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Загрузка замечаний...</p>
      ) : vm.remarks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Замечаний нет</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">№</TableHead>
              <TableHead className="w-28">Статус</TableHead>
              <TableHead>Замечание</TableHead>
              <TableHead className="w-36">Кем выдано</TableHead>
              <TableHead className="w-36">Ответственный</TableHead>
              <TableHead className="w-28">Срок</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.remarks.map((r, i) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => vm.openSheet(r)}
              >
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'}>
                    {REMARK_STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {r.title && <p className="font-medium text-sm">{r.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.text}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{userName(r.issuedBy)}</TableCell>
                <TableCell className="text-sm">{userName(responsible)}</TableCell>
                <TableCell className="text-sm">{formatDate(r.remediationDeadline)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Sheet — карточка замечания */}
      <Sheet open={vm.sheetOpen} onOpenChange={vm.setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {vm.selectedRemark && (
            <>
              <SheetHeader>
                <SheetTitle>{vm.selectedRemark.title ?? 'Замечание'}</SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList>
                  <TabsTrigger value="info">Информация</TabsTrigger>
                  <TabsTrigger value="replies">
                    Ответы
                    {vm.selectedRemark._count.replies > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {vm.selectedRemark._count.replies}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Вкладка Информация */}
                <TabsContent value="info" className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Статус</p>
                    <Badge variant={STATUS_VARIANT[vm.selectedRemark.status] ?? 'outline'}>
                      {REMARK_STATUS_LABELS[vm.selectedRemark.status] ?? vm.selectedRemark.status}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Текст замечания</p>
                    <p className="text-sm">{vm.selectedRemark.text}</p>
                  </div>

                  {vm.selectedRemark.objectDescription && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Место/объект</p>
                      <p className="text-sm">{vm.selectedRemark.objectDescription}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Кем выдано</p>
                      <p>{userName(vm.selectedRemark.issuedBy)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Дата выдачи</p>
                      <p>{formatDate(vm.selectedRemark.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Срок устранения</p>
                      <p>{formatDate(vm.selectedRemark.remediationDeadline)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ответственный</p>
                      <p>{userName(responsible)}</p>
                    </div>
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex gap-2 pt-2">
                    {vm.selectedRemark.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        onClick={() => vm.acceptRemark(vm.selectedRemark!.id)}
                        disabled={vm.isAccepting}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Принять
                      </Button>
                    )}
                    {vm.selectedRemark.status === 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => vm.returnRemark(vm.selectedRemark!.id)}
                        disabled={vm.isReturning}
                      >
                        <RotateCcw className="mr-1 h-4 w-4" />
                        Вернуть на доработку
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* Вкладка Ответы */}
                <TabsContent value="replies" className="space-y-3 pt-2">
                  {vm.isRepliesLoading ? (
                    <p className="text-sm text-muted-foreground">Загрузка...</p>
                  ) : vm.replies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ответов нет</p>
                  ) : (
                    vm.replies.map((reply) => (
                      <div key={reply.id} className="rounded-md border p-3 space-y-1">
                        {reply.title && <p className="text-sm font-medium">{reply.title}</p>}
                        <p className="text-sm">{reply.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {userName(reply.author)} · {formatDate(reply.createdAt)}
                        </p>
                      </div>
                    ))
                  )}

                  {/* Форма добавления ответа */}
                  <div className="flex gap-2 pt-2">
                    <Textarea
                      placeholder="Ваш ответ..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      className="flex-1 resize-none"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddReply}
                      disabled={!replyText.trim() || vm.isAddingReply}
                      className="self-end"
                    >
                      Отправить
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
