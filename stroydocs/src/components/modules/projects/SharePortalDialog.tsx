'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Trash2, Link as LinkIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';

interface PortalToken {
  id: string;
  token: string;
  projectId: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}

export function SharePortalDialog({ open, onOpenChange, projectId }: Props) {
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tokenData, isLoading } = useQuery<PortalToken | null>({
    queryKey: ['portal-token', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/portal-token`);
      const json = await res.json();
      return json.success ? json.data : null;
    },
    enabled: open,
  });

  const createToken = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/portal-token`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания ссылки');
      return json.data as PortalToken;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-token', projectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const revokeToken = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/portal-token`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка отзыва ссылки');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-token', projectId] });
      toast({ title: 'Ссылка отозвана' });
    },
  });

  const portalUrl = tokenData
    ? `${window.location.origin}/portal/${tokenData.token}`
    : null;

  async function handleCopy() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Ссылка скопирована' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Поделиться с заказчиком
          </DialogTitle>
          <DialogDescription>
            Заказчик увидит прогресс объекта, статус ИД и открытые замечания без регистрации
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : portalUrl ? (
            <>
              <div className="space-y-2">
                <Label>Ссылка для заказчика</Label>
                <div className="flex gap-2">
                  <Input value={portalUrl} readOnly className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ссылка активна без ограничения по времени. Заказчик может открыть её без входа в систему.
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <LinkIcon className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Ссылка ещё не создана
              </p>
              <Button onClick={() => createToken.mutate()} disabled={createToken.isPending}>
                {createToken.isPending ? 'Создание...' : 'Создать ссылку'}
              </Button>
            </div>
          )}
        </div>

        {portalUrl && (
          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => revokeToken.mutate()}
              disabled={revokeToken.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Отозвать доступ
            </Button>
            <Button onClick={() => onOpenChange(false)}>Готово</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
