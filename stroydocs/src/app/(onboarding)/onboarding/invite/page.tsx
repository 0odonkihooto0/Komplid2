'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/useToast';

interface InviteRow {
  email: string;
  role: 'MANAGER' | 'ENGINEER' | 'FOREMAN' | 'WORKER';
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Менеджер проекта',
  ENGINEER: 'Инженер / ПТО',
  FOREMAN: 'Прораб',
  WORKER: 'Рабочий',
};

export default function OnboardingInvitePage() {
  const router = useRouter();
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'ENGINEER' }]);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows((prev) => [...prev, { email: '', role: 'ENGINEER' }]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof InviteRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async () => {
    const validInvites = rows.filter((r) => r.email.trim() && r.email.includes('@'));
    if (validInvites.length === 0) {
      toast({ title: 'Добавьте хотя бы один email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/invite-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invites: validInvites }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка', variant: 'destructive' });
        return;
      }
      const count = json.data?.invitedCount ?? validInvites.length;
      toast({ title: `Приглашения отправлены (${count})` });
      router.push('/onboarding/first-project');
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await fetch('/api/onboarding/invite-team', { method: 'DELETE' });
    } finally {
      router.push('/onboarding/first-project');
    }
  };

  return (
    <OnboardingShell step={4} canSkip skipTo="/onboarding/first-project">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Пригласите команду</h1>
        <p className="mt-2 text-muted-foreground">
          Можно добавить коллег сейчас или пропустить этот шаг
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              {idx === 0 && <Label>Email</Label>}
              <Input
                type="email"
                placeholder="colleague@company.ru"
                value={row.email}
                onChange={(e) => updateRow(idx, 'email', e.target.value)}
              />
            </div>
            <div className="w-44 space-y-1">
              {idx === 0 && <Label>Роль</Label>}
              <Select
                value={row.role}
                onValueChange={(v) => updateRow(idx, 'role', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="mb-0.5 text-muted-foreground hover:text-destructive text-lg leading-none"
                aria-label="Удалить"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {rows.length < 10 && (
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-primary underline underline-offset-2 mb-8"
        >
          + Добавить ещё
        </button>
      )}

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Пока пропущу
        </button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="lg"
          className="min-w-40"
        >
          {loading ? 'Отправка...' : 'Отправить приглашения →'}
        </Button>
      </div>
    </OnboardingShell>
  );
}
