'use client';

import { Clock } from 'lucide-react';
import type { TaskDetail } from './useTaskDetail';

interface Report {
  id: string;
  progress: string;
  newDeadline: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface Props {
  reports: Report[];
  task: TaskDetail;
}

interface HistoryEntry {
  id: string;
  date: string;
  actor: string;
  text: string;
  type: 'created' | 'report';
}

export function TaskHistoryTab({ reports, task }: Props) {
  const entries: HistoryEntry[] = [
    {
      id: 'created',
      date: task.createdAt,
      actor: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
      text: 'Задача создана',
      type: 'created',
    },
    ...reports.map((r) => ({
      id: r.id,
      date: r.createdAt,
      actor: `${r.author.firstName} ${r.author.lastName}`,
      text: r.progress,
      type: 'report' as const,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="p-4">
      <div className="relative space-y-4 pl-6">
        <div className="absolute left-2 top-0 h-full w-px bg-gray-200" />
        {entries.map((entry) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-4 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gray-200">
              <Clock className="h-2.5 w-2.5 text-gray-500" />
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{entry.actor}</span>
                <span>
                  {new Date(entry.date).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700 line-clamp-3">{entry.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
