'use client';

import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  contractId?: string;
}

/** Кнопка пакетного XML-экспорта всех подписанных АОСР/ОЖР объекта */
export function BatchXmlExportButton({ projectId, contractId }: Props) {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/id-export-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractId ? { contractId } : {}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Ошибка экспорта');
      return json.data as { downloadUrl: string; docsExported: number; docsSkipped: number };
    },
    onSuccess: (data) => {
      toast({
        title: `XML экспортировано: ${data.docsExported} документов`,
        description: data.docsSkipped > 0 ? `Пропущено: ${data.docsSkipped}` : undefined,
      });
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка XML-экспорта', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => exportMutation.mutate()}
      disabled={exportMutation.isPending}
    >
      <FileCode className="mr-2 h-4 w-4" />
      {exportMutation.isPending ? 'Экспорт XML...' : 'Экспорт XML (Минстрой)'}
    </Button>
  );
}
