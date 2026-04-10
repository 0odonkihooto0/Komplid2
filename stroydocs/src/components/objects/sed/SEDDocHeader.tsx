'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, X, Play, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SEDDocumentFull } from './useSEDDocumentCard';
import type { SEDStatus } from './useSEDList';

const STATUS_LABELS: Record<SEDStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  DRAFT:           { label: 'Черновик',          variant: 'outline' },
  ACTIVE:          { label: 'Активный',          variant: 'default' },
  IN_APPROVAL:     { label: 'На согласовании',   variant: 'warning' },
  REQUIRES_ACTION: { label: 'Требует действия',  variant: 'warning' },
  APPROVED:        { label: 'Согласован',        variant: 'success' },
  REJECTED:        { label: 'Отклонён',          variant: 'destructive' },
  ARCHIVED:        { label: 'Архив',             variant: 'secondary' },
};

interface SEDDocHeaderProps {
  doc: SEDDocumentFull;
  objectId: string;
  onClose: () => void;
  isPatchPending: boolean;
  isWorkflowPending: boolean;
  onPatchStatus: (status: SEDStatus) => void;
  onStartWorkflow: () => void;
  onCreateWorkflow: () => void;
}

export function SEDDocHeader({
  doc,
  objectId,
  onClose,
  isPatchPending,
  isWorkflowPending,
  onPatchStatus,
  onStartWorkflow,
  onCreateWorkflow,
}: SEDDocHeaderProps) {
  const router = useRouter();
  const st = STATUS_LABELS[doc.status];

  const canActivate = doc.status === 'DRAFT';
  const canStartWorkflow = doc.status === 'DRAFT' || doc.status === 'ACTIVE';
  const canArchive = doc.status === 'ACTIVE' || doc.status === 'APPROVED';

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/objects/${objectId}/sed`)}
        className="-ml-1 shrink-0"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        К списку СЭД
      </Button>

      <h1 className="text-xl font-semibold flex-1 min-w-0 truncate">
        {doc.number} — {doc.title}
      </h1>

      <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>

      <Button variant="outline" size="sm" className="shrink-0" onClick={onCreateWorkflow}>
        Создать ДО
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canActivate && (
            <DropdownMenuItem
              disabled={isPatchPending}
              onClick={() => onPatchStatus('ACTIVE')}
            >
              <Play className="h-4 w-4 mr-2" />
              Активировать
            </DropdownMenuItem>
          )}
          {canStartWorkflow && (
            <DropdownMenuItem
              disabled={isWorkflowPending}
              onClick={onStartWorkflow}
            >
              <Play className="h-4 w-4 mr-2" />
              Запустить согласование
            </DropdownMenuItem>
          )}
          {canArchive && (
            <DropdownMenuItem
              disabled={isPatchPending}
              onClick={() => onPatchStatus('ARCHIVED')}
            >
              <Archive className="h-4 w-4 mr-2" />
              В архив
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Печать
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
