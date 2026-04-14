'use client';

import { useSession } from 'next-auth/react';
import { Shield, CheckCircle2, Clock, XCircle, RotateCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useSigningTab } from './useSigningTab';
import { formatDate } from '@/utils/format';

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
}

const STEP_STATUS_CONFIG = {
  WAITING: { label: 'Ожидает', icon: Clock, className: 'text-yellow-600' },
  SIGNED: { label: 'Подписано', icon: CheckCircle2, className: 'text-green-600' },
  REJECTED: { label: 'Отклонено', icon: XCircle, className: 'text-red-600' },
} as const;

export function SigningTab({ projectId, contractId, docId }: Props) {
  const { data: session } = useSession();
  const {
    route,
    isRouteLoading,
    templates,
    employees,
    mode,
    setMode,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedSignerIds,
    setSelectedSignerIds,
    startMutation,
    signMutation,
    resetMutation,
  } = useSigningTab(projectId, contractId, docId);

  if (isRouteLoading) return <Skeleton className="h-40 w-full" />;

  // Нет активного маршрута — показываем форму запуска
  if (!route || route.status === 'REJECTED') {
    const canStart = mode === 'template' ? !!selectedTemplateId : selectedSignerIds.length > 0;

    const toggleSigner = (id: string) =>
      setSelectedSignerIds((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );

    return (
      <div className="space-y-6 rounded-md border p-5">
        <div>
          <h3 className="text-sm font-semibold">Отправить на подписание</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Выберите способ формирования списка подписантов
          </p>
        </div>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as 'template' | 'manual')}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="template" id="mode-template" />
            <Label htmlFor="mode-template">По шаблону</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="manual" id="mode-manual" />
            <Label htmlFor="mode-manual">Выбрать вручную</Label>
          </div>
        </RadioGroup>

        {mode === 'template' && (
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите шаблон..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {mode === 'manual' && (
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border p-3">
            {employees.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет сотрудников</p>
            ) : (
              employees.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`signer-${e.id}`}
                    checked={selectedSignerIds.includes(e.id)}
                    onCheckedChange={() => toggleSigner(e.id)}
                  />
                  <Label htmlFor={`signer-${e.id}`} className="cursor-pointer text-sm font-normal">
                    {e.lastName} {e.firstName}
                    {e.position && (
                      <span className="ml-1 text-xs text-muted-foreground">— {e.position}</span>
                    )}
                  </Label>
                </div>
              ))
            )}
          </div>
        )}

        <Button
          onClick={() => startMutation.mutate()}
          disabled={!canStart || startMutation.isPending}
          className="w-full"
        >
          <Shield className="mr-2 h-4 w-4" />
          Отправить на подписание
        </Button>
      </div>
    );
  }

  // Маршрут существует (PENDING или SIGNED) — показываем таблицу подписантов
  const myStep = route.steps.find(
    (s) => s.user.id === session?.user?.id && s.status === 'WAITING'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Маршрут подписания
          </span>
          {route.status === 'PENDING' && (
            <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
              На подписании
            </Badge>
          )}
          {route.status === 'SIGNED' && (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              Подписан
            </Badge>
          )}
        </div>
        {route.status === 'PENDING' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Сбросить маршрут
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">№</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">ФИО</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Должность</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Сертификат</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Статус подписи</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {route.steps.map((step) => {
              const cfg = STEP_STATUS_CONFIG[step.status];
              const Icon = cfg.icon;
              return (
                <tr key={step.id}>
                  <td className="px-3 py-2 text-muted-foreground">{step.stepIndex + 1}</td>
                  <td className="px-3 py-2 font-medium">
                    {step.user.lastName} {step.user.firstName}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {step.user.position ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {step.certificateInfo ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`flex items-center gap-1 ${cfg.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {step.signedAt ? formatDate(step.signedAt) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        {myStep && route.status === 'PENDING' && (
          <Button
            variant="default"
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending}
          >
            <Shield className="mr-2 h-4 w-4" />
            Подписать (ЭЦП)
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() =>
            alert('Лист подписания — функция в разработке. Будет доступна в следующей версии.')
          }
        >
          <FileText className="mr-2 h-4 w-4" />
          Скачать лист подписания
        </Button>
      </div>

      {myStep && route.status === 'PENDING' && (
        <p className="text-xs text-muted-foreground">
          Требуется КриптоПро CSP. Настройте провайдера ЭЦП в настройках организации для активации
          подписания.
        </p>
      )}
    </div>
  );
}
