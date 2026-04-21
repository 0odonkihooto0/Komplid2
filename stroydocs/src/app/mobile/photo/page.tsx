'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { CameraCapture } from '@/components/mobile/CameraCapture';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ENTITY_TYPES = [
  { value: 'WORK_RECORD', label: 'Журнал работ' },
  { value: 'DEFECT', label: 'Дефект' },
  { value: 'JOURNAL_ENTRY', label: 'Запись журнала' },
] as const;

type EntityType = typeof ENTITY_TYPES[number]['value'];

export default function MobilePhotoPage() {
  const router = useRouter();
  const [entityType, setEntityType] = useState<EntityType>('WORK_RECORD');
  const [capturedCount, setCapturedCount] = useState(0);

  const handleCaptured = (_clientId: string) => {
    setCapturedCount((n) => n + 1);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Фото</h1>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Тип объекта</label>
        <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CameraCapture entityType={entityType} onCaptured={handleCaptured} />

      {capturedCount > 0 && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Сохранено фото: {capturedCount}</span>
        </div>
      )}
    </div>
  );
}
