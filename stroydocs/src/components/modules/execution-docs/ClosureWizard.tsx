'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useClosureWizard, WIZARD_STEP_LABELS } from './useClosureWizard';

interface Props {
  objectId: string;
  onClose: () => void;
}

export function ClosureWizard({ objectId, onClose }: Props) {
  const vm = useClosureWizard(objectId, onClose);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад к списку
        </Button>
        <span className="text-sm text-muted-foreground">{WIZARD_STEP_LABELS[vm.step]}</span>
      </div>

      {/* Шаг 1: выбор документов */}
      {vm.step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={vm.typeFilter} onValueChange={vm.setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Тип документа" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="exec">Исполнительные</SelectItem>
                <SelectItem value="registry">Реестры</SelectItem>
                <SelectItem value="archive">Архивные</SelectItem>
                <SelectItem value="AOSR">АОСР</SelectItem>
                <SelectItem value="OZR">ОЖР</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={vm.selectAll}>
              Выбрать все ({vm.allDocs.length})
            </Button>
            <Button variant="outline" size="sm" onClick={vm.deselectAll}>
              Снять выбор
            </Button>
          </div>

          {vm.isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Загрузка документов...</p>
          ) : vm.filteredDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Нет доступных документов
            </p>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Тип</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Номер</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Название</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.filteredDocs.map((doc) => (
                    <tr key={`${doc.kind}:${doc.id}`} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={vm.selectedIds.has(`${doc.kind}:${doc.id}`)}
                          onCheckedChange={() => vm.toggleDoc(doc.kind, doc.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{doc.type}</td>
                      <td className="px-3 py-2">{doc.number}</td>
                      <td className="px-3 py-2 truncate max-w-xs">{doc.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => vm.setStep(2)} disabled={vm.selectedIds.size === 0}>
              Далее ({vm.selectedIds.size} выбрано)
            </Button>
          </div>
        </div>
      )}

      {/* Шаг 2: предпросмотр */}
      {vm.step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Выбрано {vm.selectedRows.length} из {vm.allDocs.length} документов ({vm.completenessPercent}%)
            </p>
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${vm.completenessPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-md border max-h-[350px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase w-10">№</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Тип</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Номер</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Название</th>
                </tr>
              </thead>
              <tbody>
                {vm.selectedRows.map((doc, i) => (
                  <tr key={`${doc.kind}:${doc.id}`} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-muted-foreground">{doc.type}</td>
                    <td className="px-3 py-2">{doc.number}</td>
                    <td className="px-3 py-2 truncate max-w-xs">{doc.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => vm.setStep(1)}>Назад</Button>
            <Button onClick={() => vm.setStep(3)}>Далее</Button>
          </div>
        </div>
      )}

      {/* Шаг 3: название и создание */}
      {vm.step === 3 && (
        <div className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label htmlFor="closure-name">Название пакета *</Label>
            <Input
              id="closure-name"
              placeholder="Например: Закрывающий пакет ИД по объекту"
              value={vm.packageName}
              onChange={(e) => vm.setPackageName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="closure-number">Номер (необязательно)</Label>
            <Input
              id="closure-number"
              placeholder="ЗП-001"
              value={vm.packageNumber}
              onChange={(e) => vm.setPackageNumber(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Документов: {vm.selectedRows.length} (ИД: {vm.selectedRows.filter((d) => d.kind === 'exec').length},
            реестры: {vm.selectedRows.filter((d) => d.kind === 'registry').length},
            архив: {vm.selectedRows.filter((d) => d.kind === 'archive').length})
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => vm.setStep(2)}>Назад</Button>
            <Button
              onClick={vm.handleCreate}
              disabled={!vm.packageName.trim() || vm.createPending}
            >
              {vm.createPending ? 'Создание...' : 'Создать пакет'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
