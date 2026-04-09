'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { ArrowLeft } from 'lucide-react';
import { useLrvWizard, STEP_LABELS } from './useLrvWizard';

// ─── Компонент ────────────────────────────────────────────────────────────────

interface LrvWizardProps {
  objectId: string;
  onClose: () => void;
}

export function LrvWizard({ objectId, onClose }: LrvWizardProps) {
  const vm = useLrvWizard(objectId, onClose);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад к списку
        </Button>
        <span className="text-sm text-muted-foreground">{STEP_LABELS[vm.step]}</span>
      </div>

      {/* ── Шаг 1: выбор версии ГПР ─────────────────────────── */}
      {vm.step === 1 && (
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1">
            <Label>Версия ГПР</Label>
            <Select
              value={vm.versionId}
              onValueChange={vm.setVersionId}
              disabled={vm.versionsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите версию ГПР..." />
              </SelectTrigger>
              <SelectContent>
                {vm.versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                    {v.isActive ? ' (активная)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vm.versions.length === 0 && !vm.versionsLoading && (
              <p className="text-xs text-muted-foreground">
                Нет версий ГПР. Сначала создайте ГПР для объекта.
              </p>
            )}
          </div>
          <Button
            onClick={() => vm.setStep(2)}
            disabled={!vm.versionId || vm.materialsLoading}
          >
            {vm.materialsLoading ? 'Загрузка...' : 'Далее'}
          </Button>
        </div>
      )}

      {/* ── Шаг 2: таблица с чекбоксами ─────────────────────── */}
      {vm.step === 2 && (
        <div className="space-y-4">
          {vm.materialsLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Загрузка материалов...</p>
          ) : vm.materials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              В выбранной версии ГПР нет материалов
            </p>
          ) : (
            <DataTable
              columns={vm.step2Cols}
              data={vm.materials}
              searchPlaceholder="Поиск по наименованию..."
              searchColumn="materialName"
            />
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => vm.setStep(1)}>
              Назад
            </Button>
            <Button
              onClick={() => vm.setStep(3)}
              disabled={vm.selectedKeys.size === 0}
            >
              Выбрать позиции ({vm.selectedKeys.size})
            </Button>
          </div>
        </div>
      )}

      {/* ── Шаг 3: предпросмотр выбранных ───────────────────── */}
      {vm.step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Выбрано {vm.selectedRows.length} позиций
          </p>
          <div className="rounded-md border text-sm">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Наименование</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Ед.</th>
                  <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Кол-во</th>
                </tr>
              </thead>
              <tbody>
                {vm.selectedRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.materialName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.materialUnit ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.quantityRemaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => vm.setStep(2)}>
              Назад
            </Button>
            <Button onClick={() => vm.setStep(4)}>
              Далее
            </Button>
          </div>
        </div>
      )}

      {/* ── Шаг 4: номер ЛРВ и создание ─────────────────────── */}
      {vm.step === 4 && (
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1">
            <Label htmlFor="wizard-number">Номер ЛРВ</Label>
            <Input
              id="wizard-number"
              placeholder="Например: ЛРВ-001"
              value={vm.lrvNumber}
              onChange={(e) => vm.setLrvNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && vm.handleCreate()}
              autoFocus
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => vm.setStep(3)}>
              Назад
            </Button>
            <Button
              onClick={vm.handleCreate}
              disabled={!vm.lrvNumber.trim() || vm.createPending}
            >
              {vm.createPending ? 'Создание...' : 'Создать ЛРВ'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
