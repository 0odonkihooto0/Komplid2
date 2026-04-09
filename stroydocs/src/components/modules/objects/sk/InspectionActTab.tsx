'use client';

import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import type { InspectionActItem } from './useInspections';

interface Props {
  acts: InspectionActItem[];
  objectId: string;
  inspectionId: string;
}

export function InspectionActTab({ acts, objectId, inspectionId }: Props) {
  if (acts.length === 0) {
    return (
      <div className="py-6 text-sm text-muted-foreground">
        Акт проверки создаётся автоматически при завершении проверки
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      {acts.map((act) => (
        <div key={act.id} className="flex items-center justify-between gap-3 rounded-md border p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Акт проверки №{act.number}</p>
              <p className="text-xs text-muted-foreground">
                Выдан: {formatDate(act.issuedAt)} &mdash;{' '}
                {act.issuedBy.lastName} {act.issuedBy.firstName}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`/api/projects/${objectId}/inspection-acts/${act.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}
