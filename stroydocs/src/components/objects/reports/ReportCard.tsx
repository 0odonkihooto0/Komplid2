'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/utils/format';
import { useReportCard } from './useReportCard';
import { ReportBlocksList } from './ReportBlocksList';
import { AddBlockDialog } from './AddBlockDialog';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик',
  GENERATED: 'Сформирован',
  SIGNED: 'Подписан',
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  GENERATED: 'bg-blue-100 text-blue-700',
  SIGNED: 'bg-green-100 text-green-700',
};

interface Props {
  objectId: string;
  reportId: string;
}

export function ReportCard({ objectId, reportId }: Props) {
  const router = useRouter();
  const {
    report,
    isLoading,
    addBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    generatePdf,
    isPdfGenerating,
    addBlockOpen,
    setAddBlockOpen,
    editBlockId,
    setEditBlockId,
    deleteReport,
  } = useReportCard(objectId, reportId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!report) {
    return <div className="p-6 text-muted-foreground">Отчёт не найден</div>;
  }

  return (
    <div className="space-y-4 p-6">
      {/* ─── Шапка ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/objects/${objectId}/reports/list`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Отчёт №{report.number}</h2>
        <span className="text-muted-foreground text-sm">{report.name}</span>
        <Badge className={STATUS_CLASS[report.status] ?? ''} variant="outline">
          {STATUS_LABEL[report.status] ?? report.status}
        </Badge>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => void generatePdf()}
                disabled={isPdfGenerating}
              >
                <Printer className="mr-2 h-4 w-4" />
                {isPdfGenerating ? 'Формирование...' : 'Печать (PDF)'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteReport.mutate()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить отчёт
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Вкладки ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="content">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="files">Файлы</TabsTrigger>
          <TabsTrigger value="approval">Подписание</TabsTrigger>
          <TabsTrigger value="content">Содержание отчёта</TabsTrigger>
        </TabsList>

        {/* Информация */}
        <TabsContent value="info" className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Наименование</p>
              <p className="font-medium">{report.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Категория</p>
              <p className="font-medium">{report.category?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Начало периода</p>
              <p className="font-medium">{report.periodStart ? formatDate(report.periodStart) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Конец периода</p>
              <p className="font-medium">{report.periodEnd ? formatDate(report.periodEnd) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Автор</p>
              <p className="font-medium">
                {report.author
                  ? `${report.author.lastName} ${report.author.firstName}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Из шаблона</p>
              <p className="font-medium">{report.template?.name ?? '—'}</p>
            </div>
          </div>
        </TabsContent>

        {/* Файлы */}
        <TabsContent value="files" className="pt-4">
          <div className="space-y-2">
            {report.pdfS3Key ? (
              <div className="flex items-center justify-between rounded border px-4 py-2 text-sm">
                <span>{report.fileName ?? 'report.pdf'}</span>
                <Button size="sm" variant="outline" onClick={() => void generatePdf()}>
                  Скачать PDF
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                PDF не сформирован. Используйте ⋮ → «Печать (PDF)».
              </p>
            )}
          </div>
        </TabsContent>

        {/* Подписание */}
        <TabsContent value="approval" className="pt-4">
          <p className="text-sm text-muted-foreground">
            Маршрут согласования будет доступен в следующей версии.
          </p>
        </TabsContent>

        {/* Содержание отчёта */}
        <TabsContent value="content" className="pt-4">
          <ReportBlocksList
            objectId={objectId}
            reportId={reportId}
            blocks={report.blocks}
            onReorder={reorderBlocks}
            onUpdateBlock={updateBlock.mutate}
            onDeleteBlock={deleteBlock.mutate}
            editBlockId={editBlockId}
            setEditBlockId={setEditBlockId}
            onAddBlock={() => setAddBlockOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* ─── Диалог добавления блока ─────────────────────────────────────────── */}
      <AddBlockDialog
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        existingBlocks={report.blocks}
        onSubmit={addBlock.mutate}
        isPending={addBlock.isPending}
      />
    </div>
  );
}
