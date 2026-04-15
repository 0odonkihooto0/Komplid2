'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import type { InspectionActItem } from './useInspections';

interface Props {
  acts: InspectionActItem[];
  objectId: string;
  inspectionStatus: string;
}

export function InspectionActTab({ acts, objectId, inspectionStatus }: Props) {
  if (acts.length === 0) {
    const message =
      inspectionStatus === 'COMPLETED'
        ? 'Акт не сформирован (нарушения не выявлены)'
        : 'Акт проверки создаётся автоматически при завершении проверки';
    return (
      <div className="py-6 text-sm text-muted-foreground">{message}</div>
    );
  }

  return (
    <div className="py-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-left font-medium">№ акта</th>
            <th className="pb-2 text-left font-medium">Дата выдачи</th>
            <th className="pb-2 text-left font-medium">Кем выдано</th>
            <th className="pb-2 text-left font-medium">Организация проверяющего</th>
            <th className="pb-2 text-right font-medium" />
          </tr>
        </thead>
        <tbody>
          {acts.map((act) => (
            <tr key={act.id} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">АП-{act.number}</td>
              <td className="py-3 pr-4">{formatDate(act.issuedAt)}</td>
              <td className="py-3 pr-4">
                {act.issuedBy.lastName} {act.issuedBy.firstName}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {act.issuedBy.organization?.name ?? '—'}
              </td>
              <td className="py-3 text-right">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/api/projects/${objectId}/inspection-acts/${act.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Печать акта
                  </a>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
