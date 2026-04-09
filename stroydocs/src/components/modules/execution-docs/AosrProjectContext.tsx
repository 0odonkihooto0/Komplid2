'use client';

import Link from 'next/link';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AosrRegistryContext } from '@/types/aosr-registry';

interface Props {
  context: AosrRegistryContext;
  projectId: string;
  contractId: string;
}

interface ParticipantRowProps {
  label: string;
  org: string;
  rep: string;
  isMissing: boolean;
  participantsUrl: string;
}

function ParticipantRow({ label, org, rep, isMissing, participantsUrl }: ParticipantRowProps) {
  if (!org) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="shrink-0 font-medium text-muted-foreground w-32">{label}:</span>
      <div className="flex-1">
        <span>{org}</span>
        {rep && <span className="text-muted-foreground ml-2">— {rep}</span>}
        {isMissing && (
          <Link href={participantsUrl} className="ml-2 inline-flex items-center gap-1 text-yellow-600 hover:underline">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs">Заполните ФИО и должность</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function AosrProjectContext({ context, projectId, contractId }: Props) {
  const participantsUrl = `/objects/${projectId}/contracts/${contractId}?tab=participants`;

  const rows = [
    { label: 'Застройщик', org: context.developerOrg, rep: context.developerRep, role: 'Застройщик' },
    { label: 'Подрядчик', org: context.contractorOrg, rep: context.contractorRep, role: 'Подрядчик' },
    { label: 'Авторнадзор', org: context.supervisionOrg, rep: context.supervisionRep, role: 'Авторский надзор' },
    { label: 'Субподрядчик', org: context.subcontractorOrg, rep: context.subcontractorRep, role: 'Субподрядчик' },
  ];

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-2 text-sm">
            <span className="shrink-0 font-medium text-muted-foreground w-32">Объект:</span>
            <span className="font-medium">{context.object || '—'}</span>
            {context.contractNumber && (
              <span className="text-muted-foreground">· Договор {context.contractNumber}</span>
            )}
          </div>
          <Link
            href={participantsUrl}
            className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Редактировать участников
          </Link>
        </div>

        {rows.map(({ label, org, rep, role }) => (
          <ParticipantRow
            key={role}
            label={label}
            org={org}
            rep={rep}
            isMissing={context.missingReps.includes(role)}
            participantsUrl={participantsUrl}
          />
        ))}
      </CardContent>
    </Card>
  );
}
