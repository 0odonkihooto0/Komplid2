'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, CalendarClock } from 'lucide-react';
import { AddTaskReportDialog } from './AddTaskReportDialog';
import type { TaskRoleType, TaskStatus } from './useGlobalTasks';

interface Report {
  id: string;
  progress: string;
  newDeadline: string | null;
  s3Keys: string[];
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface Props {
  reports: Report[];
  currentUserRole: TaskRoleType | null;
  taskStatus: TaskStatus;
  onAddReport: (data: { progress: string; newDeadline?: string }) => void;
}

function ReportCard({ report }: { report: Report }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">
            {report.author.firstName[0]}{report.author.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium">{report.author.firstName} {report.author.lastName}</span>
        <span className="ml-auto text-xs text-gray-400">
          {new Date(report.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.progress}</p>
      {report.newDeadline && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
          <CalendarClock className="h-3.5 w-3.5" />
          Новый срок: {new Date(report.newDeadline).toLocaleDateString('ru-RU')}
        </div>
      )}
    </div>
  );
}

export function TaskReportsTab({ reports, currentUserRole, taskStatus, onAddReport }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const canAddReport = currentUserRole === 'EXECUTOR' && taskStatus === 'IN_PROGRESS';

  async function handleSubmit(data: { progress: string; newDeadline?: string }) {
    setIsPending(true);
    try { onAddReport(data); } finally { setIsPending(false); }
  }

  return (
    <div className="p-4">
      {canAddReport && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Добавить отчёт
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((report) => <ReportCard key={report.id} report={report} />)}
        {reports.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Отчётов пока нет</p>
        )}
      </div>

      <AddTaskReportDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </div>
  );
}
