'use client';

import { Download, ChevronDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/utils/format';
import type { InspectionActItem } from './useInspections';

interface Props {
  acts: InspectionActItem[];
  objectId: string;
  inspectionStatus: string;
}

async function handleDownloadDocx(objectId: string, actId: string, number: string) {
  try {
    const res = await fetch(
      `/api/projects/${objectId}/inspection-acts/${actId}/print?format=docx`,
      { method: 'POST' },
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-act-${number}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Ошибка скачивания Word акта проверки:', err);
  }
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Печать
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a
                        href={`/api/projects/${objectId}/inspection-acts/${act.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Скачать PDF
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleDownloadDocx(objectId, act.id, act.number)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Скачать Word (.doc)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
