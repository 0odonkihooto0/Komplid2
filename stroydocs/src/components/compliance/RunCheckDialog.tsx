'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RunCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

interface ClosurePackage {
  id: string;
  name: string;
  number?: string | null;
}

export function RunCheckDialog({ open, onOpenChange, objectId }: RunCheckDialogProps) {
  const router = useRouter();
  const [scope, setScope] = useState<'FULL_PROJECT' | 'CLOSURE_PACKAGE'>('FULL_PROJECT');
  const [closurePackageId, setClosurePackageId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: packagesData } = useQuery<{ data: ClosurePackage[] }>({
    queryKey: ['closure-packages-list', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/closure-packages?limit=50`);
      return res.json();
    },
    enabled: open && scope === 'CLOSURE_PACKAGE',
  });

  const packages = packagesData?.data ?? [];

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { scope };
      if (scope === 'CLOSURE_PACKAGE' && closurePackageId && closurePackageId !== 'NONE') {
        body.closurePackageId = closurePackageId;
      }
      const res = await fetch(`/api/projects/${objectId}/compliance-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Ошибка запуска проверки');
        return;
      }
      onOpenChange(false);
      router.push(`/objects/${objectId}/id/compliance?checkId=${json.data.checkId}`);
    } catch {
      setError('Ошибка запуска проверки');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    scope === 'FULL_PROJECT' || (scope === 'CLOSURE_PACKAGE' && closurePackageId !== '' && closurePackageId !== 'NONE');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI-проверка комплектности ИД</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Область проверки</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as 'FULL_PROJECT' | 'CLOSURE_PACKAGE')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FULL_PROJECT" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Весь проект
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CLOSURE_PACKAGE" id="package" />
                <Label htmlFor="package" className="font-normal cursor-pointer">
                  Закрывающий пакет ИД
                </Label>
              </div>
            </RadioGroup>
          </div>

          {scope === 'CLOSURE_PACKAGE' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Пакет</Label>
              <Select value={closurePackageId || 'NONE'} onValueChange={(v) => setClosurePackageId(v === 'NONE' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пакет..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" disabled>
                    Выберите пакет...
                  </SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                      {pkg.number ? ` (${pkg.number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Проверка займёт 1–3 минуты. Результат появится автоматически.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? 'Запускаю...' : 'Запустить проверку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
