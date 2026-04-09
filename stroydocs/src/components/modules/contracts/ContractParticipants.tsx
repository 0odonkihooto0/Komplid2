'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronDown, ChevronRight, Building2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useDeleteParticipant } from '@/hooks/useDeleteParticipant';
import type { ContractParticipantItem } from './useContract';
import type { ParticipantRole } from '@prisma/client';

const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Авторский надзор',
  SUBCONTRACTOR: 'Субподрядчик',
};

const ROLE_COLORS: Record<ParticipantRole, string> = {
  DEVELOPER: 'bg-blue-100 text-blue-800',
  CONTRACTOR: 'bg-green-100 text-green-800',
  SUPERVISION: 'bg-purple-100 text-purple-800',
  SUBCONTRACTOR: 'bg-orange-100 text-orange-800',
};

interface Props {
  participants: ContractParticipantItem[];
  projectId: string;
  contractId: string;
}

/** Карточки участников договора с раскрывающимися деталями */
export function ContractParticipants({ participants, projectId, contractId }: Props) {
  const { data: session } = useSession();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  const deleteMutation = useDeleteParticipant(projectId, contractId);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // Кнопка удаления только для ADMIN
  const isAdmin = session?.user.role === 'ADMIN';

  if (participants.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        {participants.map((participant) => {
          const isOpen = expandedIds.has(participant.id);
          const org = participant.organization;

          return (
            <div key={participant.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Заголовок карточки — кликабелен */}
              <button
                type="button"
                onClick={() => toggle(participant.id)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{org.name}</span>
                      <Badge className={cn('text-xs', ROLE_COLORS[participant.role])}>
                        {PARTICIPANT_ROLE_LABELS[participant.role]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">ИНН: {org.inn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(participant.id);
                        setDeleteTargetName(org.name);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </Button>
                  )}
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* Раскрытые детали */}
              {isOpen && (
                <div className="border-t px-4 py-4 space-y-4">
                  {/* Реквизиты организации */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">ИНН</p>
                      <p className="text-sm font-mono">{org.inn || '—'}</p>
                    </div>
                    {org.ogrn && (
                      <div>
                        <p className="text-xs text-muted-foreground">ОГРН</p>
                        <p className="text-sm font-mono">{org.ogrn}</p>
                      </div>
                    )}
                    {org.address && (
                      <div>
                        <p className="text-xs text-muted-foreground">Адрес</p>
                        <p className="text-sm">{org.address}</p>
                      </div>
                    )}
                    {org.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Телефон</p>
                        <p className="text-sm">{org.phone}</p>
                      </div>
                    )}
                    {org.sroName && (
                      <div>
                        <p className="text-xs text-muted-foreground">СРО</p>
                        <p className="text-sm">{org.sroName}</p>
                      </div>
                    )}
                    {org.sroNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground">№ СРО</p>
                        <p className="text-sm font-mono">{org.sroNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Представитель */}
                  {(participant.appointmentOrder || participant.appointmentDate) && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Представитель</p>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Приказ</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Дата приказа</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2">{participant.appointmentOrder || '—'}</td>
                              <td className="px-3 py-2">
                                {participant.appointmentDate ? formatDate(participant.appointmentDate) : '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}
        entityName={deleteTargetName}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId, {
              onSuccess: () => setDeleteTargetId(null),
            });
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
