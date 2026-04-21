'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CameraCapture } from '@/components/mobile/CameraCapture';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaywallBanner } from '@/components/subscriptions/PaywallBanner';
import { useFeature } from '@/hooks/use-feature';
import { FEATURES } from '@/lib/subscriptions/features';

const CATEGORIES = ['Качество работ', 'Отклонение от проекта', 'Безопасность', 'Материалы', 'Прочее'];
const SEVERITIES = [
  { value: 'LOW', label: 'Низкая' },
  { value: 'MEDIUM', label: 'Средняя' },
  { value: 'HIGH', label: 'Высокая' },
  { value: 'CRITICAL', label: 'Критическая' },
];

function MobileDefectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const objectId = searchParams.get('objectId') ?? '';

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Прочее');
  const [severity, setSeverity] = useState('MEDIUM');
  const [photoCount, setPhotoCount] = useState(0);
  const [isPending, setIsPending] = useState(false);

  const { hasAccess: hasDefectsLite, isLoading } = useFeature(FEATURES.DEFECTS_LITE);

  const handleCaptured = (_clientId: string) => {
    setPhotoCount((n) => n + 1);
  };

  const handleSave = async () => {
    if (!description.trim() || !objectId) return;
    setIsPending(true);
    try {
      await fetch(`/api/projects/${objectId}/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category, severity }),
      });
      router.push('/mobile');
    } finally {
      setIsPending(false);
    }
  };

  if (isLoading) return null;

  if (!hasDefectsLite) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Фиксация дефекта</h1>
        </div>
        <PaywallBanner feature={FEATURES.DEFECTS_LITE} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Фиксация дефекта</h1>
      </div>

      <Textarea
        placeholder="Описание дефекта..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        className="text-base"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Категория</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Критичность</label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CameraCapture entityType="DEFECT" onCaptured={handleCaptured} />

      {photoCount > 0 && (
        <p className="text-sm text-muted-foreground">Прикреплено фото: {photoCount}</p>
      )}

      <Button
        onClick={handleSave}
        disabled={!description.trim() || isPending}
        className="w-full h-12 text-base"
      >
        {isPending ? 'Сохранение...' : 'Зафиксировать дефект'}
      </Button>
    </div>
  );
}

export default function MobileDefectPage() {
  return (
    <Suspense>
      <MobileDefectContent />
    </Suspense>
  );
}
