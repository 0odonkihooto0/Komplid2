'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAdminFeatureFlags,
  useToggleFeatureFlag,
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useUpdateFeatureFlag,
  type FeatureFlagItem,
} from '@/hooks/useAdminFeatureFlags';

export default function AdminFeatureFlagsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editFlag, setEditFlag] = useState<FeatureFlagItem | null>(null);

  const { data, isLoading } = useAdminFeatureFlags({ search });
  const flags = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">
            Runtime флаги для A/B-тестов, rollout и kill-switch. Всего: {total}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Новый флаг</Button>
      </div>

      <Input
        placeholder="Поиск по ключу или описанию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : (
        <FeatureFlagsTable flags={flags} onEdit={setEditFlag} />
      )}

      <CreateFlagDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editFlag && <EditFlagDialog flag={editFlag} onClose={() => setEditFlag(null)} />}
    </div>
  );
}

function FeatureFlagsTable({
  flags,
  onEdit,
}: {
  flags: FeatureFlagItem[];
  onEdit: (f: FeatureFlagItem) => void;
}) {
  const toggle = useToggleFeatureFlag();
  const del = useDeleteFeatureFlag();

  if (flags.length === 0) {
    return <p className="text-muted-foreground">Флаги не найдены.</p>;
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Ключ</th>
            <th className="px-4 py-3 text-left font-medium">Описание</th>
            <th className="px-4 py-3 text-center font-medium">Включён</th>
            <th className="px-4 py-3 text-center font-medium">Rollout %</th>
            <th className="px-4 py-3 text-left font-medium">Аудитории</th>
            <th className="px-4 py-3 text-right font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {flags.map((f) => (
            <tr key={f.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-mono text-xs">{f.key}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                {f.description ?? '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(checked) => toggle.mutate({ id: f.id, enabled: checked })}
                  disabled={toggle.isPending}
                />
              </td>
              <td className="px-4 py-3 text-center">
                <Badge variant={f.rolloutPercent > 0 ? 'default' : 'outline'}>
                  {f.rolloutPercent}%
                </Badge>
              </td>
              <td className="px-4 py-3">
                <AudiencesSummary flag={f} />
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(f)}>
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => del.mutate(f.id)}
                  disabled={del.isPending}
                >
                  Удалить
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AudiencesSummary({ flag }: { flag: FeatureFlagItem }) {
  const a = flag.audiences;
  if (!a) return <span className="text-muted-foreground">—</span>;
  const parts: string[] = [];
  if (a.workspaceIds?.length) parts.push(`${a.workspaceIds.length} ws`);
  if (a.userIds?.length) parts.push(`${a.userIds.length} users`);
  if (a.intents?.length) parts.push(`${a.intents.length} intents`);
  return parts.length ? <span className="text-xs">{parts.join(', ')}</span> : <span className="text-muted-foreground">—</span>;
}

function CreateFlagDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateFeatureFlag();

  const handleSubmit = () => {
    if (!key.trim()) return;
    create.mutate(
      { key: key.trim(), description: description.trim() || undefined, enabled: false },
      { onSuccess: () => { onClose(); setKey(''); setDescription(''); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый feature flag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Ключ</label>
            <Input
              placeholder="new_ai_compliance_ui"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Только строчные буквы, цифры и _ (snake_case)
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Описание</label>
            <Input
              placeholder="Новый интерфейс проверки соответствия"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!key.trim() || create.isPending}>
            {create.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFlagDialog({ flag, onClose }: { flag: FeatureFlagItem; onClose: () => void }) {
  const [rollout, setRollout] = useState(flag.rolloutPercent);
  const [description, setDescription] = useState(flag.description ?? '');
  const update = useUpdateFeatureFlag();

  const handleSave = () => {
    update.mutate(
      { id: flag.id, data: { rolloutPercent: rollout, description: description.trim() || undefined } },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить флаг: {flag.key}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Описание</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rollout: <span className="font-bold">{rollout}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={rollout}
              onChange={(e) => setRollout(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              0% — никому, 100% — всем пользователям с userId
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
