'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreateAosrWizard, type AosrTemplate } from './useCreateAosrWizard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  isPersonalWorkspace?: boolean;
  onSuccess: (docId: string) => void;
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: AosrTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'hover:border-primary/50 hover:bg-muted/30'
      )}
    >
      <p className="text-sm font-medium leading-tight">{template.name}</p>
      {template.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
      )}
    </button>
  );
}

const STEPS = ['Шаблон', 'Участники', 'Данные работ'];

export function CreateAosrWizard({
  open,
  onOpenChange,
  projectId,
  contractId,
  isPersonalWorkspace = false,
  onSuccess,
}: Props) {
  const {
    step,
    setStep,
    form,
    updateForm,
    workTypeFilter,
    setWorkTypeFilter,
    workTypes,
    templates,
    loadingTemplates,
    createMutation,
    canProceedStep1,
    canSubmit,
  } = useCreateAosrWizard({ projectId, contractId, isPersonalWorkspace, onSuccess });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Создать АОСР</DialogTitle>
          {/* Шаги */}
          <div className="flex gap-2 pt-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                    step > i + 1
                      ? 'bg-primary text-white'
                      : step === i + 1
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn('text-xs', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <span className="text-muted-foreground/50 mx-1">→</span>}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* ШАГ 1 — Выбор шаблона */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={workTypeFilter === '' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setWorkTypeFilter('')}
                >
                  Все
                </Badge>
                {workTypes.map((wt) => (
                  <Badge
                    key={wt}
                    variant={workTypeFilter === wt ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setWorkTypeFilter(wt)}
                  >
                    {wt}
                  </Badge>
                ))}
              </div>
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Загрузка шаблонов...</p>
              ) : (
                <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                  {templates.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
                      template={tpl}
                      selected={form.templateId === tpl.id}
                      onSelect={() => updateForm({ templateId: tpl.id, workName: tpl.name.replace('АОСР — ', '') })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ШАГ 2 — Участники */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Наименование подрядчика</Label>
                <Input
                  placeholder="ООО «Строй Контракт»"
                  value={form.contractorName}
                  onChange={(e) => updateForm({ contractorName: e.target.value })}
                />
              </div>
              {!isPersonalWorkspace && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hide-auto"
                      checked={form.hideAutonadzor}
                      onChange={(e) => updateForm({ hideAutonadzor: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hide-auto" className="cursor-pointer font-normal">
                      Без представителя автонадзора
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hide-tech"
                      checked={form.hideTechnadzor}
                      onChange={(e) => updateForm({ hideTechnadzor: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hide-tech" className="cursor-pointer font-normal">
                      Без представителя технадзора
                    </Label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ШАГ 3 — Данные работ */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Наименование работ *</Label>
                <Input
                  placeholder="Устройство бетонной подготовки"
                  value={form.workName}
                  onChange={(e) => updateForm({ workName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Объём</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.volume}
                    onChange={(e) => updateForm({ volume: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Единица</Label>
                  <Input
                    placeholder="м²"
                    value={form.unit}
                    onChange={(e) => updateForm({ unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Дата начала</Label>
                  <Input
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) => updateForm({ dateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Дата окончания</Label>
                  <Input
                    type="date"
                    value={form.dateTo}
                    onChange={(e) => updateForm({ dateTo: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Нормативный документ</Label>
                <Input
                  placeholder="СП 63.13330.2018, ГЭСН 06-01-001"
                  value={form.normativeDoc}
                  onChange={(e) => updateForm({ normativeDoc: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Кнопки навигации */}
        <div className="flex justify-between pt-3 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              ← Назад
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 1 && !canProceedStep1}
            >
              Далее →
            </Button>
          ) : (
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать АОСР'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
