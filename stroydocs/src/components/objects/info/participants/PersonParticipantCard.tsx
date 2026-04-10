'use client';

import { useState } from 'react';
import { User, FileText, Copy, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PARTICIPANT_ROLES } from '@/lib/validations/participants';
import type { PersonParticipant } from './types';

interface Props {
  participant: PersonParticipant;
  onAddRole: (participantId: string, roleName: string) => void;
  onDeleteRole: (participantId: string, roleId: string) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onAddAppointment: (personId: string) => void;
  isLoading?: boolean;
}

export function PersonParticipantCard({
  participant,
  onAddRole,
  onDeleteRole,
  onDelete,
  onCopy,
  onAddAppointment,
  isLoading,
}: Props) {
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fullName = [participant.lastName, participant.firstName, participant.middleName]
    .filter(Boolean)
    .join(' ');

  const assignedRoleNames = participant.roles.map((r) => r.roleName);
  const availableRoles = PARTICIPANT_ROLES.filter((r) => !assignedRoleNames.includes(r));

  // Синяя иконка если есть хотя бы одно активное назначение
  const hasActiveAppointment = participant.appointments.some((a) => a.isActive);

  const handleAddRole = (roleName: string) => {
    onAddRole(participant.id, roleName);
    setRolePopoverOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
      {/* Шапка: иконка + ФИО + организация */}
      <div className="flex items-start gap-2">
        <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fullName}</p>
          {participant.organization && (
            <p className="truncate text-xs text-muted-foreground">
              {participant.organization.name}
            </p>
          )}
        </div>
        {/* Кнопки действий */}
        <div className="flex shrink-0 gap-1">
          {/* Иконка документа о назначении */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={hasActiveAppointment ? 'Документ о назначении (есть)' : 'Добавить документ о назначении'}
            onClick={() => onAddAppointment(participant.id)}
          >
            <FileText
              className={`h-3.5 w-3.5 ${hasActiveAppointment ? 'text-blue-600' : 'text-muted-foreground'}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Скопировать в другой объект"
            onClick={() => onCopy(participant.id)}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Удалить"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Роли */}
      <div className="flex flex-wrap items-center gap-1.5">
        {participant.roles.map((role) => (
          <Badge
            key={role.id}
            variant="secondary"
            className="cursor-pointer bg-blue-100 text-blue-800 text-xs hover:bg-blue-200"
            onClick={() => onDeleteRole(participant.id, role.id)}
            title="Нажмите для удаления роли"
          >
            {role.roleName} ×
          </Badge>
        ))}
        {availableRoles.length > 0 && (
          <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                disabled={isLoading}
              >
                + Добавить роль
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2">
              <div className="flex flex-col gap-1">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    className="rounded px-2 py-1 text-left text-sm hover:bg-accent"
                    onClick={() => handleAddRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Удалить физлицо?"
        description={`«${fullName}» будет удалён из списка участников. Все роли и документы о назначении будут удалены.`}
        confirmLabel="Удалить"
        onConfirm={() => {
          onDelete(participant.id);
          setConfirmDeleteOpen(false);
        }}
        variant="destructive"
      />
    </div>
  );
}
