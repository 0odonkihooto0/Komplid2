'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useMembersTable, type WorkspaceMemberRow } from '@/components/workspace/useMembersTable';
import { MembersTable } from '@/components/workspace/MembersTable';
import { QuotaIndicator } from '@/components/workspace/QuotaIndicator';
import { InviteMemberModal } from '@/components/workspace/InviteMemberModal';
import { ChangeRoleModal } from '@/components/workspace/ChangeRoleModal';
import { RemoveMemberModal } from '@/components/workspace/RemoveMemberModal';
import { BulkActionsBar } from '@/components/workspace/BulkActionsBar';

export function MembersPageContent() {
  const { members, columns, isLoading, meta, selectedIds, clearSelection } = useMembersTable();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [changingRole, setChangingRole] = useState<WorkspaceMemberRow | null>(null);
  const [removing, setRemoving] = useState<WorkspaceMemberRow | null>(null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Команда</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление участниками рабочего пространства
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Пригласить
        </Button>
      </div>

      <QuotaIndicator used={meta?.total ?? 0} total={null} />

      <MembersTable
        members={members}
        baseColumns={columns}
        isLoading={isLoading}
        onChangeRole={setChangingRole}
        onRemove={setRemoving}
      />

      <BulkActionsBar
        selectedIds={selectedIds}
        members={members}
        clearSelection={clearSelection}
      />

      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} />
      <ChangeRoleModal member={changingRole} onClose={() => setChangingRole(null)} />
      <RemoveMemberModal member={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}
