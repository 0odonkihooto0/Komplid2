'use client';

import { useState } from 'react';
import { Printer, Loader2, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/useToast';
import { ShareToPTODialog } from './ShareToPTODialog';

type PrintFormat = 'pdf' | 'doc' | 'xls';

interface Props {
  objectId: string;
  journalId: string;
  journalNumber: string;
  journalTitle?: string;
  disabled?: boolean;
}

const FORMAT_LABELS: Record<PrintFormat, string> = {
  pdf: 'Скачать PDF',
  doc: 'Скачать DOC',
  xls: 'Скачать XLS',
};

const FORMAT_EXT: Record<PrintFormat, string> = {
  pdf: 'pdf',
  doc: 'doc',
  xls: 'xlsx',
};

export function JournalPrintMenu({ objectId, journalId, journalNumber, journalTitle, disabled }: Props) {
  const { toast } = useToast();
  const [loadingFormat, setLoadingFormat] = useState<PrintFormat | null>(null);

  const handlePrint = async (format: PrintFormat) => {
    if (loadingFormat) return;
    setLoadingFormat(format);

    try {
      const res = await fetch(
        `/api/projects/${objectId}/journals/${journalId}/print?format=${format}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Ошибка формирования файла');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${journalNumber}.${FORMAT_EXT[format]}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка скачивания';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoadingFormat(null);
    }
  };

  const isLoading = loadingFormat !== null;

  return (
    <div className="flex gap-2">
      <ShareToPTODialog
        projectId={objectId}
        journalId={journalId}
        journalTitle={journalTitle ?? journalNumber}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoading}
            aria-label="Печать журнала"
          >
            {isLoading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-1 h-4 w-4" />
            )}
            Печать
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['pdf', 'doc', 'xls'] as PrintFormat[]).map((fmt) => (
            <DropdownMenuItem
              key={fmt}
              onClick={() => handlePrint(fmt)}
              disabled={isLoading}
              className="gap-2"
            >
              {loadingFormat === fmt ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : fmt === 'xls' ? (
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              {FORMAT_LABELS[fmt]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
