'use client';

import { Building2, User, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { OrgParticipantCard } from './OrgParticipantCard';
import { PersonParticipantCard } from './PersonParticipantCard';
import { FilterParticipantsPanel } from './FilterParticipantsPanel';
import { AddParticipantDialog } from './AddParticipantDialog';
import { AddAppointmentDialog } from './AddAppointmentDialog';
import { CopyParticipantDialog } from './CopyParticipantDialog';
import { useParticipants } from './useParticipants';
import type { ParticipantRoleName } from '@/lib/validations/participants';

interface Props {
  projectId: string;
}

export function ParticipantsView({ projectId }: Props) {
  const {
    isLoading,
    filteredOrgs,
    filteredPersons,
    filter,
    setFilter,
    addDialogOpen,
    addDialogType,
    setAddDialogOpen,
    openAddOrg,
    openAddPerson,
    copyTarget,
    setCopyTarget,
    appointmentPersonId,
    setAppointmentPersonId,
    addParticipantMutation,
    addRoleMutation,
    deleteRoleMutation,
    deleteParticipantMutation,
    copyMutation,
    addAppointmentMutation,
  } = useParticipants(projectId);

  const handleAddRole = (participantId: string, roleName: ParticipantRoleName, type: 'org' | 'person') => {
    addRoleMutation.mutate({ participantId, data: { roleName, participantType: type } });
  };

  const handleDeleteRole = (participantId: string, roleId: string) => {
    deleteRoleMutation.mutate({ participantId, roleId });
  };

  const handleDelete = (id: string, type: 'org' | 'person') => {
    deleteParticipantMutation.mutate({ id, type });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Фильтр */}
      <FilterParticipantsPanel filter={filter} onFilterChange={setFilter} />

      {/* Двухколоночный layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Левая колонка — юрлица */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Юридические лица</h3>
              <span className="text-xs text-muted-foreground">({filteredOrgs.length})</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={openAddOrg}>
              <Plus className="mr-1 h-3 w-3" /> Добавить
            </Button>
          </div>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          ) : filteredOrgs.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="Нет юридических лиц"
              description="Добавьте организацию-участника"
            />
          ) : (
            filteredOrgs.map((org) => (
              <OrgParticipantCard
                key={org.id}
                participant={org}
                projectId={projectId}
                onAddRole={(id, roleName) => handleAddRole(id, roleName as ParticipantRoleName, 'org')}
                onDeleteRole={handleDeleteRole}
                onDelete={(id) => handleDelete(id, 'org')}
                onCopy={(id) => setCopyTarget({ id, type: 'org' })}
                isLoading={addRoleMutation.isPending || deleteRoleMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Правая колонка — физлица */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Физические лица</h3>
              <span className="text-xs text-muted-foreground">({filteredPersons.length})</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={openAddPerson}>
              <Plus className="mr-1 h-3 w-3" /> Добавить
            </Button>
          </div>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          ) : filteredPersons.length === 0 ? (
            <EmptyState
              icon={<User className="h-8 w-8" />}
              title="Нет физических лиц"
              description="Добавьте ответственных лиц"
            />
          ) : (
            filteredPersons.map((person) => (
              <PersonParticipantCard
                key={person.id}
                participant={person}
                onAddRole={(id, roleName) => handleAddRole(id, roleName as ParticipantRoleName, 'person')}
                onDeleteRole={handleDeleteRole}
                onDelete={(id) => handleDelete(id, 'person')}
                onCopy={(id) => setCopyTarget({ id, type: 'person' })}
                onAddAppointment={(id) => setAppointmentPersonId(id)}
                isLoading={addRoleMutation.isPending || deleteRoleMutation.isPending}
              />
            ))
          )}
        </div>
      </div>

      {/* Диалог добавления участника */}
      <AddParticipantDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultTab={addDialogType}
        onSubmit={async (data) => { await addParticipantMutation.mutateAsync(data); }}
        isPending={addParticipantMutation.isPending}
      />

      {/* Диалог назначения физлица */}
      {appointmentPersonId && (
        <AddAppointmentDialog
          open={!!appointmentPersonId}
          onOpenChange={(v) => { if (!v) setAppointmentPersonId(null); }}
          personId={appointmentPersonId}
          onSubmit={async (personId, fd) => {
            await addAppointmentMutation.mutateAsync({ personId, formData: fd });
          }}
          isPending={addAppointmentMutation.isPending}
        />
      )}

      {/* Диалог копирования */}
      {copyTarget && (
        <CopyParticipantDialog
          open={!!copyTarget}
          onOpenChange={(v) => { if (!v) setCopyTarget(null); }}
          participantId={copyTarget.id}
          participantType={copyTarget.type}
          currentProjectId={projectId}
          onSubmit={async (id, targetObjectId, participantType) => {
            await copyMutation.mutateAsync({ id, data: { targetObjectId, participantType } });
          }}
          isPending={copyMutation.isPending}
        />
      )}
    </div>
  );
}
