'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  isPushSupported,
} from '@/lib/push/client';

export default function NotificationSettingsPage() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    isPushSubscribed().then((v) => {
      setSubscribed(v);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      if (enabled) {
        const ok = await subscribeToPush();
        setSubscribed(ok);
      } else {
        await unsubscribeFromPush();
        setSubscribed(false);
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Настройки уведомлений</h1>

      {!loading && !supported && (
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          Ваш браузер не поддерживает push-уведомления. Попробуйте Chrome или Edge на Android.
        </div>
      )}

      {supported && (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="font-medium">Push-уведомления на этом устройстве</div>
            <div className="text-sm text-muted-foreground">
              Новые замечания, согласования, приближение дедлайнов
            </div>
          </div>
          <Switch
            checked={subscribed}
            onCheckedChange={handleToggle}
            disabled={loading || toggling}
          />
        </div>
      )}

      {supported && !subscribed && !loading && (
        <p className="text-sm text-muted-foreground">
          Включите уведомления, чтобы получать оповещения о замечаниях и согласованиях
          даже когда приложение закрыто.
        </p>
      )}
    </div>
  );
}
