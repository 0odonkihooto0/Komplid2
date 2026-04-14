'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { ExecutionDocsFilters } from './useExecutionDocs';

interface Props {
  contractId: string;
  visibleColumns: string[];
  filters?: ExecutionDocsFilters;
}

export function ExportTableButton({ contractId, visibleColumns, filters }: Props) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setIsPending(true);
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/execution-docs/export-table?format=${format}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, columns: visibleColumns, filters }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка экспорта');
      window.open(json.data.url, '_blank');
      toast({
        title: `Экспорт готов`,
        description: `${json.data.rowCount} документов`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка экспорта',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={isPending}>
          <Download className="h-4 w-4" />
          {isPending ? 'Экспорт...' : 'Экспорт'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('xlsx')} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Экспорт в Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2">
          <FileText className="h-4 w-4 text-red-600" />
          Экспорт в PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
