import { Building2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ParticipantRole } from '@prisma/client';
import type { ObjectParticipantItem } from './useParticipantsView';

const ROLE_LABELS: Record<ParticipantRole, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Авторский надзор',
  SUBCONTRACTOR: 'Субподрядчик',
};

const ROLE_COLORS: Record<ParticipantRole, string> = {
  DEVELOPER: 'bg-blue-100 text-blue-800',
  CONTRACTOR: 'bg-green-100 text-green-800',
  SUPERVISION: 'bg-yellow-100 text-yellow-800',
  SUBCONTRACTOR: 'bg-gray-100 text-gray-700',
};

interface Props {
  item: ObjectParticipantItem;
}

export function ParticipantCard({ item }: Props) {
  const { organization, roles, contracts } = item;

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        {/* Заголовок: иконка + название */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight">{organization.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">ИНН: {organization.inn}</p>
          </div>
        </div>

        {/* Роли */}
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role} className={cn('text-xs', ROLE_COLORS[role])}>
              {ROLE_LABELS[role]}
            </Badge>
          ))}
        </div>

        {/* СРО */}
        {organization.sroNumber && (
          <div className="flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">СРО {organization.sroNumber}</span>
          </div>
        )}

        {/* Договоры */}
        {contracts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Договоры:</p>
            <div className="flex flex-wrap gap-1">
              {contracts.map((c) => (
                <Badge key={c.id} variant="outline" className="text-xs font-normal">
                  {c.number}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
