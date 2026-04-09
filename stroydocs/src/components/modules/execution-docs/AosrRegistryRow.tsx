'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { EXECUTION_DOC_STATUS_LABELS } from '@/utils/constants';
import { AosrEditableCell } from './AosrEditableCell';
import type { AosrRegistryRow } from '@/types/aosr-registry';
import type { ExecutionDocStatus } from '@prisma/client';

const STATUS_COLORS: Record<ExecutionDocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

interface Props {
  row: AosrRegistryRow;
  projectId: string;
  contractId: string;
  onSave: (docId: string, field: string, value: string) => void;
}

export function AosrRegistryRowItem({ row, projectId, contractId, onSave }: Props) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${row.id}/generate-pdf`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка генерации');
      toast({ title: 'PDF сгенерирован', description: 'Обновите страницу для скачивания' });
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось создать PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const isReadonly = row.status === 'SIGNED';

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="px-2 py-1 text-sm font-mono text-center w-16 whitespace-nowrap">
        {row.number}
      </td>
      <td className="px-1 py-0.5 max-w-[200px]">
        <AosrEditableCell
          value={row.workName}
          dbValue={row.workName}
          field="workName"
          docId={row.id}
          onSave={onSave}
          readonly
        />
      </td>
      <td className="px-1 py-0.5 max-w-[160px]">
        <AosrEditableCell
          value={row.schemaRef}
          dbValue=""
          field="schemaRef"
          docId={row.id}
          onSave={onSave}
          readonly={isReadonly}
        />
      </td>
      <td className="px-1 py-0.5 max-w-[180px]">
        <AosrEditableCell
          value={row.nextWorks}
          dbValue=""
          field="nextWorks"
          docId={row.id}
          onSave={onSave}
          readonly={isReadonly}
        />
      </td>
      <td className="px-1 py-0.5 max-w-[200px]">
        <AosrEditableCell
          value={row.materials}
          dbValue={row.dbMaterials}
          field="materials"
          docId={row.id}
          onSave={onSave}
          readonly={isReadonly}
        />
      </td>
      <td className="px-1 py-0.5 max-w-[180px]">
        <AosrEditableCell
          value={row.certificates}
          dbValue={row.dbCertificates}
          field="certificates"
          docId={row.id}
          onSave={onSave}
          readonly={isReadonly}
        />
      </td>
      <td className="px-2 py-1 whitespace-nowrap w-28">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status]}`}>
          {EXECUTION_DOC_STATUS_LABELS[row.status]}
        </span>
      </td>
      <td className="px-2 py-1 w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleDownload}
          disabled={downloading}
          title="Сгенерировать PDF"
        >
          <FileDown className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
