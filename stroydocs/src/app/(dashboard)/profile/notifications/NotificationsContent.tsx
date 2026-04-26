'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

interface NotifPrefs {
  emailDigest: boolean;
  emailDocumentSigned: boolean;
  emailInvitation: boolean;
  emailPayment: boolean;
  pushEnabled: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  emailDigest: true,
  emailDocumentSigned: true,
  emailInvitation: true,
  emailPayment: true,
  pushEnabled: false,
};

export function NotificationsContent() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof NotifPrefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    // Заглушка — будет подключена к API уведомлений в следующих фазах
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    toast({ title: 'Настройки уведомлений сохранены' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Email-уведомления</CardTitle>
          </div>
          <CardDescription>Выберите, о чём получать письма</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotifRow
            id="emailDigest"
            label="Еженедельный дайджест"
            description="Сводка активности по вашим объектам"
            checked={prefs.emailDigest}
            onChange={() => toggle('emailDigest')}
          />
          <NotifRow
            id="emailDocumentSigned"
            label="Документы подписаны"
            description="Когда документ согласован или отклонён"
            checked={prefs.emailDocumentSigned}
            onChange={() => toggle('emailDocumentSigned')}
          />
          <NotifRow
            id="emailInvitation"
            label="Приглашения в команду"
            description="Когда вас приглашают в рабочее пространство"
            checked={prefs.emailInvitation}
            onChange={() => toggle('emailInvitation')}
          />
          <NotifRow
            id="emailPayment"
            label="Платежи и подписка"
            description="Квитанции, напоминания о продлении"
            checked={prefs.emailPayment}
            onChange={() => toggle('emailPayment')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Push-уведомления (PWA)</CardTitle>
          <CardDescription>Уведомления в браузере при закрытом приложении</CardDescription>
        </CardHeader>
        <CardContent>
          <NotifRow
            id="pushEnabled"
            label="Включить push-уведомления"
            description="Требует разрешения браузера"
            checked={prefs.pushEnabled}
            onChange={() => toggle('pushEnabled')}
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </div>
  );
}

function NotifRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id} className="font-normal cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
