'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Globe, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { usePublicitySettings } from './usePublicitySettings';
import { toast } from '@/hooks/useToast';

interface PublicitySettingsProps {
  objectId: string;
}

// Панель управления публичностью объекта строительства
export function PublicitySettings({ objectId }: PublicitySettingsProps) {
  const { data, isLoading, save, isSaving } = usePublicitySettings(objectId);
  const isEnabled = !!data?.token;

  const [hideCosts, setHideCosts] = useState(true);
  const [hideAddress, setHideAddress] = useState(false);
  const [hideDefects, setHideDefects] = useState(false);
  const [allowIndexing, setAllowIndexing] = useState(false);

  useEffect(() => {
    if (data?.customSettings) {
      setHideCosts(data.customSettings.hideCosts);
      setHideAddress(data.customSettings.hideAddress);
      setHideDefects(data.customSettings.hideDefects);
    }
    if (data) setAllowIndexing(data.allowIndexing);
  }, [data]);

  function handleToggle(enabled: boolean) {
    save({ enabled, hideCosts, hideAddress, hideDefects, allowIndexing });
  }

  function handleSaveSettings() {
    save({ enabled: true, hideCosts, hideAddress, hideDefects, allowIndexing });
  }

  function handleRevoke() {
    save({ enabled: false });
  }

  function copyLink() {
    if (data?.publicUrl) {
      void navigator.clipboard.writeText(data.publicUrl);
      toast({ title: 'Ссылка скопирована' });
    }
  }

  if (isLoading) return <div className="animate-pulse h-40 rounded-xl bg-muted" />;

  return (
    <div className="space-y-4">
      {/* Переключатель публичного доступа */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-primary" />
            Публичный доступ
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            id="public-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
          <Label htmlFor="public-toggle">
            {isEnabled ? 'Включён' : 'Выключен'}
          </Label>
        </CardContent>
      </Card>

      {/* Публичная ссылка */}
      {isEnabled && data?.publicUrl && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Input value={data.publicUrl} readOnly className="text-sm" />
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Скопировать">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={data.publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Открыть">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Просмотров: {data.viewCount}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Настройки видимости */}
      {isEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Настройки видимости</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { id: 'hideCosts',   val: hideCosts,   set: setHideCosts,   label: 'Скрыть суммы договоров и смет' },
                { id: 'hideAddress', val: hideAddress, set: setHideAddress, label: 'Показывать только город (без полного адреса)' },
                { id: 'hideDefects', val: hideDefects, set: setHideDefects, label: 'Скрыть дефекты категории VIOLATION' },
                { id: 'allowIdx',    val: allowIndexing, set: setAllowIndexing, label: 'Разрешить индексацию поисковиками' },
              ] as { id: string; val: boolean; set: (v: boolean) => void; label: string }[]
            ).map(({ id, val, set, label }) => (
              <div key={id} className="flex items-center gap-2">
                <Switch id={id} checked={val} onCheckedChange={set} />
                <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
              </div>
            ))}
            <Button size="sm" onClick={handleSaveSettings} disabled={isSaving} className="mt-2">
              Сохранить настройки
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Отзыв ссылки */}
      {isEnabled && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Отозвать ссылку
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Отозвать публичную ссылку?</AlertDialogTitle>
              <AlertDialogDescription>
                Заказчик больше не сможет открыть дашборд. Действие необратимо.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoke}>Отозвать</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
