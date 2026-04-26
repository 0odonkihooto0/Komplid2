'use client';

import { Plug, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const INTEGRATIONS = [
  {
    id: 'yandex_disk',
    name: 'Яндекс.Диск',
    description: 'Экспорт документов и фотоотчётов в облако',
    available: false,
  },
  {
    id: 'cryptopro',
    name: 'КриптоПро ЭЦП',
    description: 'Электронная подпись документов (квалифицированная)',
    available: false,
  },
] as const;

export function IntegrationsContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Интеграции</CardTitle>
          </div>
          <CardDescription>Подключите внешние сервисы к вашему аккаунту</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{item.name}</p>
                  {!item.available && (
                    <Badge variant="secondary" className="text-[10px]">Скоро</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <Button variant="outline" size="sm" disabled={!item.available}>
                Подключить
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">API-токены</CardTitle>
          </div>
          <CardDescription>
            Для тарифа Corporate — программный доступ к данным через REST API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Управление токенами доступно на тарифе Corporate.
          </p>
          <Button variant="outline" size="sm" className="mt-3" disabled>
            Создать токен
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
