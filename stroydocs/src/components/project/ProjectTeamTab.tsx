'use client';

import { ProjectRole } from '@prisma/client';
import { UserPlus, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AssignMemberModal } from './AssignMemberModal';
import { useProjectTeam, type ProjectMemberRow } from './useProjectTeam';

const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  PROJECT_OWNER: 'Рук. проекта',
  PROJECT_MANAGER: 'РП',
  SITE_FOREMAN: 'Прораб',
  SPECIALIST: 'Специалист',
  WORKER: 'Исполнитель',
  OBSERVER: 'Наблюдатель',
};

interface Props {
  objectId: string;
}

export function ProjectTeamTab({ objectId }: Props) {
  const {
    policy,
    assigned,
    allWorkspaceMembers,
    isLoading,
    assignOpen,
    setAssignOpen,
    changePolicy,
    isPolicyChanging,
    assignMember,
    isAssigning,
    removeMember,
  } = useProjectTeam(objectId);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Загрузка команды…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Политика доступа */}
      <section className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium text-sm">Политика доступа к объекту</h3>
        <RadioGroup
          value={policy}
          onValueChange={(v) => changePolicy(v as 'WORKSPACE_WIDE' | 'ASSIGNED_ONLY')}
          className="space-y-2"
          aria-disabled={isPolicyChanging}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="WORKSPACE_WIDE" id="policy-wide" />
            <Label htmlFor="policy-wide" className="cursor-pointer leading-snug">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Все члены рабочего пространства
              </span>
              <span className="text-xs text-muted-foreground">
                Объект виден всем участникам команды
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="ASSIGNED_ONLY" id="policy-assigned" />
            <Label htmlFor="policy-assigned" className="cursor-pointer leading-snug">
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Только назначенные участники
              </span>
              <span className="text-xs text-muted-foreground">
                OWNER и ADMIN всегда имеют доступ независимо от этой настройки
              </span>
            </Label>
          </div>
        </RadioGroup>
      </section>

      {/* Назначенные участники */}
      {policy === 'ASSIGNED_ONLY' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              Назначенные участники ({assigned.length})
            </h3>
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Назначить
            </Button>
          </div>

          {assigned.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Никто не назначен. Объект недоступен для членов команды.
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {assigned.map((m: ProjectMemberRow) => (
                <MemberRow key={m.id} member={m} onRemove={() => removeMember(m.id)} />
              ))}
            </div>
          )}

          <AssignMemberModal
            open={assignOpen}
            onOpenChange={setAssignOpen}
            candidates={allWorkspaceMembers}
            isSubmitting={isAssigning}
            onSubmit={(data) => { assignMember(data); setAssignOpen(false); }}
          />
        </section>
      )}

      {/* Информационный блок для WORKSPACE_WIDE */}
      {policy === 'WORKSPACE_WIDE' && (
        <section className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">
            Доступ имеют все {allWorkspaceMembers.length} активных участников команды
          </p>
          <p>
            Для ограничения доступа переключитесь на режим «Только назначенные участники».
          </p>
        </section>
      )}
    </div>
  );
}

function MemberRow({
  member,
  onRemove,
}: {
  member: ProjectMemberRow;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {member.user.firstName[0]}{member.user.lastName[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {member.user.firstName} {member.user.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <Badge variant="secondary" className="text-xs">
          {PROJECT_ROLE_LABELS[member.projectRole]}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {member.workspaceRole}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-7 px-2"
          onClick={onRemove}
        >
          Снять
        </Button>
      </div>
    </div>
  );
}
