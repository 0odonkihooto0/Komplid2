'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { AuditLogFilters } from '@/hooks/useAuditLog';

const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  {
    label: 'Авторизация',
    actions: ['auth.signup', 'auth.signin', 'auth.signout', 'auth.password_changed'],
  },
  {
    label: 'Воркспейс',
    actions: ['workspace.created', 'workspace.updated', 'workspace.deleted', 'workspace.transferred_ownership'],
  },
  {
    label: 'Участники',
    actions: ['member.invited', 'member.joined', 'member.role_changed', 'member.suspended', 'member.reactivated', 'member.removed'],
  },
  {
    label: 'Подписка',
    actions: ['subscription.created', 'subscription.upgraded', 'subscription.downgraded', 'subscription.cancelled', 'subscription.payment_failed'],
  },
  {
    label: 'Проекты',
    actions: ['project.created', 'project.published_dashboard', 'project.member_added', 'project.member_removed'],
  },
  {
    label: 'Документы',
    actions: ['document.signed', 'document.rejected', 'document.deleted'],
  },
];

interface Props {
  filters: AuditLogFilters;
  onChange: (filters: AuditLogFilters) => void;
  onExportCsv: () => void;
  isExporting?: boolean;
}

export function AuditLogFilters({ filters, onChange, onExportCsv, isExporting }: Props) {
  const hasActiveFilters = filters.from || filters.to || filters.action || filters.resourceType;

  function reset() {
    onChange({ page: 1, take: filters.take });
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <Label htmlFor="audit-from" className="text-xs text-muted-foreground">
          С
        </Label>
        <Input
          id="audit-from"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => onChange({ ...filters, from: e.target.value || undefined, page: 1 })}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="audit-to" className="text-xs text-muted-foreground">
          По
        </Label>
        <Input
          id="audit-to"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => onChange({ ...filters, to: e.target.value || undefined, page: 1 })}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Событие</Label>
        <Select
          value={filters.action || 'ALL'}
          onValueChange={(v) =>
            onChange({ ...filters, action: v === 'ALL' ? undefined : v, page: 1 })
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Все события" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все события</SelectItem>
            {ACTION_GROUPS.map((group) =>
              group.actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Ресурс</Label>
        <Select
          value={filters.resourceType || 'ALL'}
          onValueChange={(v) =>
            onChange({ ...filters, resourceType: v === 'ALL' ? undefined : v, page: 1 })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все</SelectItem>
            <SelectItem value="User">Пользователь</SelectItem>
            <SelectItem value="Workspace">Воркспейс</SelectItem>
            <SelectItem value="Project">Проект</SelectItem>
            <SelectItem value="Subscription">Подписка</SelectItem>
            <SelectItem value="WorkspaceMember">Участник</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
          <X className="h-3.5 w-3.5" />
          Сбросить
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onExportCsv}
        disabled={isExporting}
        className="ml-auto"
      >
        {isExporting ? 'Экспорт...' : 'Экспорт CSV'}
      </Button>
    </div>
  );
}
