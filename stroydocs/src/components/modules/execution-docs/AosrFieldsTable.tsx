'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAosrEdit } from './useAosrEdit';
import type { ExecutionDocStatus } from '@prisma/client';

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
  docStatus: ExecutionDocStatus;
  currentOverrideFields?: Record<string, string> | null;
  suggestedFields?: Record<string, string> | null;
  onClose: () => void;
}

const TABLE_COLUMNS: { key: string; label: string; multiline?: boolean; minWidth?: number }[] = [
  { key: 'rabota', label: 'Выполненные работы', multiline: true, minWidth: 220 },
  { key: 'shema', label: 'Схема', minWidth: 120 },
  { key: 'Next', label: 'Разрешаются работы', minWidth: 160 },
  { key: 'D1', label: 'Нач. (д.)', minWidth: 70 },
  { key: 'M1', label: 'Нач. (м.)', minWidth: 70 },
  { key: 'D2', label: 'Кон. (д.)', minWidth: 70 },
  { key: 'M2', label: 'Кон. (м.)', minWidth: 70 },
  { key: 'material', label: 'Материал', multiline: true, minWidth: 180 },
  { key: 'cert', label: 'Сертификат', minWidth: 140 },
  { key: 'nач_cifry', label: 'Начало дат', minWidth: 110 },
  { key: 'kon_cifry', label: 'Конец дат', minWidth: 110 },
  { key: 'SNIP', label: 'СП/норматив', minWidth: 160 },
  { key: 'project', label: 'Шифр', minWidth: 100 },
];

export function AosrFieldsTable({
  projectId,
  contractId,
  docId,
  docStatus,
  currentOverrideFields,
  suggestedFields,
  onClose,
}: Props) {
  const { saveAndRegenerate, isPending } = useAosrEdit(projectId, contractId, docId);
  const isReadOnly = docStatus === 'SIGNED';
  const isInReview = docStatus === 'IN_REVIEW';

  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      TABLE_COLUMNS.map((col) => [
        col.key,
        currentOverrideFields?.[col.key] ?? suggestedFields?.[col.key] ?? '',
      ])
    )
  );

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const nonEmpty = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim() !== ''));
    await saveAndRegenerate(nonEmpty);
    onClose();
  };

  return (
    <div className="rounded-md border">
      {isReadOnly && (
        <div className="p-3 border-b">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Документ подписан — редактирование недоступно.</AlertDescription>
          </Alert>
        </div>
      )}
      {isInReview && !isReadOnly && (
        <div className="p-3 border-b">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Статус «На проверке» — согласование не сбрасывается при сохранении.</AlertDescription>
          </Alert>
        </div>
      )}
      {!currentOverrideFields && suggestedFields && (
        <div className="p-3 border-b">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Поля предзаполнены автоматически из данных записи о работе — проверьте и при необходимости скорректируйте.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-r px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap w-10">
                №
              </th>
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="border-r px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                  style={{ minWidth: col.minWidth }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-r px-3 py-2 text-muted-foreground text-center align-top">
                1
              </td>
              {TABLE_COLUMNS.map((col) => (
                <td key={col.key} className="border-r px-2 py-1.5 align-top">
                  {col.multiline ? (
                    <Textarea
                      rows={3}
                      value={fields[col.key]}
                      onChange={(e) => handleChange(col.key, e.target.value)}
                      disabled={isReadOnly}
                      className="min-w-0 resize-none text-sm"
                    />
                  ) : (
                    <Input
                      value={fields[col.key]}
                      onChange={(e) => handleChange(col.key, e.target.value)}
                      disabled={isReadOnly}
                      className="min-w-0 text-sm h-8"
                    />
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 p-3 border-t">
        {!isReadOnly && (
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Сохранение...' : 'Сохранить и перегенерировать PDF'}
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
