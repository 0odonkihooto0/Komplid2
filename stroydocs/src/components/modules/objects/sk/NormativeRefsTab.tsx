'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAddNormativeRef, useDeleteNormativeRef } from './useNormativeRefs';

interface NormativeRef {
  id: string;
  reference: string;
  description: string | null;
}

interface Props {
  objectId: string;
  defectId: string;
  /** Основная ссылка из поля Defect.normativeRef (readonly) */
  normativeRef: string | null;
  /** Дополнительные ссылки из DefectNormativeRef[] */
  normativeRefs: NormativeRef[];
}

export function NormativeRefsTab({ objectId, defectId, normativeRef, normativeRefs }: Props) {
  const [refInput, setRefInput] = useState('');
  const [descInput, setDescInput] = useState('');

  const addRef = useAddNormativeRef(objectId, defectId);
  const deleteRef = useDeleteNormativeRef(objectId, defectId);

  const handleAdd = () => {
    const trimmed = refInput.trim();
    if (!trimmed) return;
    addRef.mutate(
      { reference: trimmed, description: descInput.trim() || undefined },
      {
        onSuccess: () => {
          setRefInput('');
          setDescInput('');
        },
      },
    );
  };

  const hasAny = normativeRef || normativeRefs.length > 0;

  return (
    <div className="space-y-4">
      {/* Таблица */}
      {hasAny ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-left">
              <th className="pb-2 font-medium pr-4 w-2/5">Ссылка</th>
              <th className="pb-2 font-medium pr-4">Описание</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {/* Основная ссылка из Defect.normativeRef — readonly */}
            {normativeRef && (
              <tr className="border-b">
                <td className="py-2 pr-4 text-muted-foreground">{normativeRef}</td>
                <td className="py-2 pr-4 text-xs text-muted-foreground italic">основная</td>
                <td />
              </tr>
            )}
            {/* Дополнительные ссылки */}
            {normativeRefs.map((ref) => (
              <tr key={ref.id} className="border-b">
                <td className="py-2 pr-4">{ref.reference}</td>
                <td className="py-2 pr-4 text-muted-foreground">{ref.description ?? '—'}</td>
                <td className="py-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    disabled={deleteRef.isPending}
                    onClick={() => deleteRef.mutate(ref.id)}
                    aria-label="Удалить ссылку"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">Нормативные ссылки не указаны</p>
      )}

      {/* Форма добавления */}
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="ГОСТ Р 12.0.230-2007 п. 4.3"
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Input
          className="flex-1"
          placeholder="Описание (необязательно)"
          value={descInput}
          onChange={(e) => setDescInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!refInput.trim() || addRef.isPending}
        >
          {addRef.isPending ? '...' : 'Добавить'}
        </Button>
      </div>
    </div>
  );
}
