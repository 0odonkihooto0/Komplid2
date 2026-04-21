'use client';

import { useState } from 'react';
import { Copy, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/useToast';
import { useFeature } from '@/hooks/use-feature';
import { FEATURES } from '@/lib/subscriptions/features';
import { PaywallBanner } from '@/components/subscriptions/PaywallBanner';

interface Props {
  versionId: string;
  versionName: string;
  open: boolean;
  onClose: () => void;
}

const EXPIRES_OPTIONS = [
  { label: '1 день', value: '1' },
  { label: '7 дней', value: '7' },
  { label: '30 дней', value: '30' },
  { label: 'Бессрочно', value: '' },
];

export function ShareEstimateDialog({ versionId, versionName, open, onClose }: Props) {
  const { hasAccess, isLoading } = useFeature(FEATURES.ESTIMATES_PUBLIC_LINK);
  const [expiresIn, setExpiresIn] = useState('7');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimate-versions/${versionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'VIEW',
          expiresInDays: expiresIn ? Number(expiresIn) : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка создания ссылки', variant: 'destructive' });
        return;
      }
      const fullUrl = `${window.location.origin}${json.data.url}`;
      setShareUrl(fullUrl);
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    await fetch(`/api/estimate-versions/${versionId}/share`, { method: 'DELETE' });
    setShareUrl(null);
    toast({ title: 'Ссылка отозвана' });
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Ссылка скопирована' });
  };

  const handleClose = () => {
    setShareUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Поделиться сметой
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          «{versionName}»
        </p>

        {isLoading ? null : !hasAccess ? (
          <PaywallBanner feature={FEATURES.ESTIMATES_PUBLIC_LINK} />
        ) : (
          <div className="space-y-4">
            {!shareUrl ? (
              <>
                <div className="space-y-1">
                  <Label>Срок действия ссылки</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRES_OPTIONS.map((o) => (
                        <SelectItem key={o.value || 'unlimited'} value={o.value || 'unlimited'}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={loading} className="w-full">
                  {loading ? 'Создание...' : 'Создать публичную ссылку'}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Ссылка для просмотра</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="text-xs" />
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    По этой ссылке смету можно посмотреть без регистрации
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCopy} className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Скопировать
                  </Button>
                  <Button variant="outline" onClick={handleRevoke}>
                    <X className="h-4 w-4 mr-1" />
                    Отозвать
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
