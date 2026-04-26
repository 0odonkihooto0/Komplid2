'use client';

import { useState } from 'react';
import { ProjectRole } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { WsMemberRow } from './useProjectTeam';

const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  PROJECT_OWNER: 'Руководитель проекта',
  PROJECT_MANAGER: 'РП (руководитель проекта)',
  SITE_FOREMAN: 'Прораб на объекте',
  SPECIALIST: 'Специалист (сметчик/ПТО)',
  WORKER: 'Исполнитель работ',
  OBSERVER: 'Наблюдатель (только чтение)',
};

interface AssignMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: WsMemberRow[];
  isSubmitting: boolean;
  onSubmit: (data: { workspaceMemberId: string; projectRole: ProjectRole; notes?: string }) => void;
}

export function AssignMemberModal({
  open,
  onOpenChange,
  candidates,
  isSubmitting,
  onSubmit,
}: AssignMemberModalProps) {
  const [wsMemberId, setWsMemberId] = useState('');
  const [projectRole, setProjectRole] = useState<ProjectRole>('SPECIALIST');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!wsMemberId) return;
    onSubmit({ workspaceMemberId: wsMemberId, projectRole, notes: notes || undefined });
    setWsMemberId('');
    setNotes('');
  };

  const unassigned = candidates.filter((c) => !c.isAssigned);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Назначить участника на объект</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="member-select">Участник команды</Label>
            <Select value={wsMemberId} onValueChange={setWsMemberId}>
              <SelectTrigger id="member-select">
                <SelectValue placeholder="Выберите участника" />
              </SelectTrigger>
              <SelectContent>
                {unassigned.length === 0 && (
                  <SelectItem value="__PLACEHOLDER__" disabled>
                    Все участники уже назначены
                  </SelectItem>
                )}
                {unassigned.map((c) => (
                  <SelectItem key={c.workspaceMemberId} value={c.workspaceMemberId}>
                    {c.user.firstName} {c.user.lastName} — {c.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-role-select">Роль в проекте</Label>
            <Select
              value={projectRole}
              onValueChange={(v) => setProjectRole(v as ProjectRole)}
            >
              <SelectTrigger id="project-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {PROJECT_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes-field">Примечание (необязательно)</Label>
            <Textarea
              id="notes-field"
              placeholder="Например: прораб нулевого цикла"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!wsMemberId || isSubmitting}>
            {isSubmitting ? 'Назначение...' : 'Назначить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
