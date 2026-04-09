'use client';

import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import type { ReportBlockType } from '@prisma/client';

// Типы без автозаполнения (пользователь заполняет вручную)
const MANUAL_TYPES: ReportBlockType[] = ['FREE_TEXT', 'CUSTOM_TABLE'];

interface Props {
  objectId: string;
  reportId: string;
  blockId: string;
  blockType: ReportBlockType;
  onFilled: () => void;
}

export function BlockAutoFill({ objectId, reportId, blockId, blockType, onFilled }: Props) {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  if (MANUAL_TYPES.includes(blockType)) return null;

  const handleFill = async () => {
    setIsPending(true);
    try {
      const res = await fetch(
        `/api/projects/${objectId}/reports/${reportId}/blocks/${blockId}/fill`,
        { method: 'POST' }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка автозаполнения');
      toast({ title: 'Блок заполнен' });
      void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
      onFilled();
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Ошибка автозаполнения',
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void handleFill()} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      Заполнить
    </Button>
  );
}
