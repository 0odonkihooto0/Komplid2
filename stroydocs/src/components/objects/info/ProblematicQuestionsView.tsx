'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ProblemIssueType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/utils/format';
import { useProblematicQuestions, type ProblematicQuestion } from './useProblematicQuestions';
import { AddQuestionDialog } from './AddQuestionDialog';
import { QuestionDetailSheet } from './QuestionDetailSheet';

export const QUESTION_TYPE_LABELS: Record<ProblemIssueType, string> = {
  CORRECTION_PSD:  'Корректировка ПСД',
  LAND_LEGAL:      'Земельно-правовые',
  PRODUCTION:      'Производственные',
  ORG_LEGAL:       'Организационно-правовые',
  CONTRACT_WORK:   'Договорная работа',
  FINANCIAL:       'Финансирование',
  MATERIAL_SUPPLY: 'Поставка материалов',
  WORK_QUALITY:    'Качество работ',
  DEADLINES:       'Сроки',
  OTHER:           'Прочее',
};

const columns: ColumnDef<ProblematicQuestion>[] = [
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => (
      <span className="text-xs">{QUESTION_TYPE_LABELS[row.original.type]}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) =>
      row.original.status === 'ACTIVE' ? (
        <Badge variant="outline" className="text-yellow-600 border-yellow-400 text-xs">Актуальный</Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">Закрыт</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Дата',
    cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
  },
  {
    accessorKey: 'description',
    header: 'Проблемный вопрос',
    cell: ({ row }) => (
      <span className="block max-w-[200px] truncate text-xs" title={row.original.description}>
        {row.original.description}
      </span>
    ),
  },
  {
    id: 'assignee',
    header: 'Исполнитель',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.assigneeOrg?.name ?? <span className="text-muted-foreground">—</span>}</span>
    ),
  },
  {
    id: 'verifier',
    header: 'Проверяющий',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.verifierOrg?.name ?? <span className="text-muted-foreground">—</span>}</span>
    ),
  },
  {
    accessorKey: 'measuresTaken',
    header: 'Предпринятые меры',
    cell: ({ row }) => row.original.measuresTaken ? (
      <span className="block max-w-[160px] truncate text-xs" title={row.original.measuresTaken}>
        {row.original.measuresTaken}
      </span>
    ) : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    accessorKey: 'resolutionDate',
    header: 'Дата решения',
    cell: ({ row }) => row.original.resolutionDate
      ? <span className="text-xs">{formatDate(row.original.resolutionDate)}</span>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    id: 'author',
    header: 'Автор',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.author.lastName} {row.original.author.firstName}</span>
    ),
  },
];

interface Props {
  objectId: string;
}

export function ProblematicQuestionsView({ objectId }: Props) {
  const { questions, isLoading } = useProblematicQuestions(objectId);
  const [createOpen, setCreateOpen]       = useState(false);
  const [selectedId, setSelectedId]       = useState<string | null>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Проблемные вопросы</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ Добавить</Button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground text-sm">Загрузка...</p>
      ) : (
        <DataTable
          columns={columns}
          data={questions}
          searchColumn="description"
          searchPlaceholder="Поиск по описанию..."
          onRowClick={(row) => setSelectedId(row.id)}
        />
      )}

      <AddQuestionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        objectId={objectId}
      />

      <QuestionDetailSheet
        objectId={objectId}
        questionId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
