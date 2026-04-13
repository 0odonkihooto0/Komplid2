'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGanttStages, useGanttVersionsByProject } from './useGanttStructure';
import {
  useVersionEditContracts, useVersionEditOrgs,
  useCreateVersion, useUpdateVersion, useCreateStage,
  versionToFormData, defaultVersionForm, actualityToDbFields,
  type VersionFormData, type GanttVersionSummary,
} from './useGanttVersionEdit';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  version?: GanttVersionSummary | null;
  defaultStageId?: string | null;
}

const CALC_METHODS = [
  { value: 'MANUAL', label: 'Вручную' },
  { value: 'VOLUME', label: 'Объём' },
  { value: 'AMOUNT', label: 'Суммы' },
  { value: 'MAN_HOURS', label: 'Чел.часы' },
  { value: 'MACHINE_HOURS', label: 'Маш.часы' },
  { value: 'LABOR', label: 'Трудовые' },
];

export function GanttVersionEditDialog({ open, onOpenChange, objectId, version, defaultStageId }: Props) {
  const isEdit = !!version;
  const { stages } = useGanttStages(objectId);
  const { contracts } = useVersionEditContracts(objectId);
  const { orgs } = useVersionEditOrgs(objectId);
  const { versions: allVersions } = useGanttVersionsByProject(objectId);
  const createVersionMut = useCreateVersion(objectId);
  const updateVersionMut = useUpdateVersion(objectId);
  const createStageMut = useCreateStage(objectId);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<VersionFormData>({
    defaultValues: version ? versionToFormData(version) : defaultVersionForm(defaultStageId ?? null),
  });

  useEffect(() => {
    if (open) reset(version ? versionToFormData(version) : defaultVersionForm(defaultStageId ?? null));
  }, [open, version, defaultStageId, reset]);

  // Автозаполнение орг из договора
  const contractId = watch('contractId');
  useEffect(() => {
    if (!contractId) return;
    const c = contracts.find((x) => x.id === contractId);
    if (!c) return;
    const dev = c.participants.find((p) => p.role === 'DEVELOPER');
    const con = c.participants.find((p) => p.role === 'CONTRACTOR');
    if (dev) setValue('delegatedFromOrgId', dev.organization.id);
    if (con) setValue('delegatedToOrgId', con.organization.id);
  }, [contractId, contracts, setValue]);

  const [newStageName, setNewStageName] = useState('');
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [accessPopoverOpen, setAccessPopoverOpen] = useState(false);
  const [linkedPopoverOpen, setLinkedPopoverOpen] = useState(false);

  const stageId = watch('stageId');
  const accessOrgIds = watch('accessOrgIds');
  const linkedVersionIds = watch('linkedVersionIds');
  const isPending = createVersionMut.isPending || updateVersionMut.isPending;

  function handleCreateStage() {
    if (!newStageName.trim()) return;
    createStageMut.mutate(newStageName.trim(), {
      onSuccess: (stage) => {
        setValue('stageId', stage.id);
        setNewStageName('');
        setStageDialogOpen(false);
      },
    });
  }

  function onSubmit(data: VersionFormData) {
    const { actuality, ...rest } = data;
    const payload = { ...rest, ...actualityToDbFields(actuality) };
    if (isEdit && version) {
      updateVersionMut.mutate({ versionId: version.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createVersionMut.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  const otherVersions = allVersions.filter((v) => v.id !== version?.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Редактировать версию ГПР' : 'Новая версия ГПР'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="general" className="flex-1 min-h-0 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 shrink-0">
                <TabsTrigger value="general" className="text-xs">Основные</TabsTrigger>
                <TabsTrigger value="participants" className="text-xs">Участники</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">Настройки</TabsTrigger>
                <TabsTrigger value="linking" className="text-xs">Объединение</TabsTrigger>
              </TabsList>

              {/* ── Таб 1: Основные данные ── */}
              <TabsContent value="general">
                <ScrollArea className="h-72">
                  <div className="space-y-3 pr-3">
                    <div className="space-y-1">
                      <Label htmlFor="ver-name">Наименование *</Label>
                      <Input id="ver-name" {...register('name', { required: true })} placeholder="Версия ГПР" />
                      {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
                    </div>
                    <div className="space-y-1">
                      <Label>Стадия</Label>
                      <div className="flex gap-2">
                        <Select value={stageId ?? ''} onValueChange={(v) => setValue('stageId', v || null)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Не выбрана" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— Не выбрана —</SelectItem>
                            {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setStageDialogOpen(true)} title="Создать стадию">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Контракт</Label>
                      <Select value={watch('contractId') ?? ''} onValueChange={(v) => setValue('contractId', v || null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Не привязан" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Не привязан —</SelectItem>
                          {contracts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.number} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Актуальность</Label>
                      <Select value={watch('actuality')} onValueChange={(v) => setValue('actuality', v as VersionFormData['actuality'])}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Актуальная</SelectItem>
                          <SelectItem value="draft">Черновик</SelectItem>
                          <SelectItem value="archive">Архив</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={watch('isDirective')} onCheckedChange={(v) => setValue('isDirective', !!v)} />
                      <span className="text-sm">Директивная версия</span>
                    </label>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Таб 2: Делегирование ── */}
              <TabsContent value="participants">
                <ScrollArea className="h-72">
                  <div className="space-y-3 pr-3">
                    <div className="space-y-1">
                      <Label>Заказчик</Label>
                      <Select value={watch('delegatedFromOrgId') ?? ''} onValueChange={(v) => setValue('delegatedFromOrgId', v || null)}>
                        <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Не выбран —</SelectItem>
                          {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Подрядчик</Label>
                      <Select value={watch('delegatedToOrgId') ?? ''} onValueChange={(v) => setValue('delegatedToOrgId', v || null)}>
                        <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Не выбран —</SelectItem>
                          {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Доступ</Label>
                      <Popover open={accessPopoverOpen} onOpenChange={setAccessPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-between">
                            {accessOrgIds.length > 0 ? `Выбрано: ${accessOrgIds.length}` : 'Выберите организации'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-1">
                          <ScrollArea className="max-h-48">
                            {orgs.length === 0 && <p className="text-xs text-muted-foreground p-2">Нет организаций</p>}
                            {orgs.map((o) => {
                              const checked = accessOrgIds.includes(o.id);
                              return (
                                <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted">
                                  <Checkbox checked={checked} onCheckedChange={() => {
                                    setValue('accessOrgIds', checked ? accessOrgIds.filter((id) => id !== o.id) : [...accessOrgIds, o.id]);
                                  }} />
                                  <span className="text-sm">{o.name}</span>
                                  {checked && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                                </label>
                              );
                            })}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Блокировка редактирования</Label>
                      {([['lockWorks', 'Работы'], ['lockPlan', 'План'], ['lockFact', 'Факт']] as const).map(([field, label]) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={watch(field)} onCheckedChange={(v) => setValue(field, !!v)} />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Таб 3: Настройки ── */}
              <TabsContent value="settings">
                <ScrollArea className="h-72">
                  <div className="space-y-3 pr-3">
                    <div className="space-y-1">
                      <Label>Метод расчёта</Label>
                      <Select value={watch('calculationMethod')} onValueChange={(v) => setValue('calculationMethod', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CALC_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {([
                      ['disableVolumeRounding', 'Отключить округление объёмов'],
                      ['allowOverplan', 'Разрешить перевыполнение плана'],
                      ['showSummaryRow', 'Суммарная запись ГПР'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={watch(field)} onCheckedChange={(v) => setValue(field, !!v)} />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Таб 4: Объединение версий ── */}
              <TabsContent value="linking">
                <ScrollArea className="h-72">
                  <div className="space-y-3 pr-3">
                    <div className="space-y-1">
                      <Label>Связанные версии</Label>
                      <p className="text-xs text-muted-foreground">Версии из других стадий для объединения</p>
                      <Popover open={linkedPopoverOpen} onOpenChange={setLinkedPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-between">
                            {linkedVersionIds.length > 0 ? `Выбрано: ${linkedVersionIds.length}` : 'Выберите версии'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-1">
                          <ScrollArea className="max-h-48">
                            {otherVersions.length === 0 && <p className="text-xs text-muted-foreground p-2">Нет других версий</p>}
                            {otherVersions.map((v) => {
                              const checked = linkedVersionIds.includes(v.id);
                              return (
                                <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted">
                                  <Checkbox checked={checked} onCheckedChange={() => {
                                    setValue('linkedVersionIds', checked ? linkedVersionIds.filter((id) => id !== v.id) : [...linkedVersionIds, v.id]);
                                  }} />
                                  <span className="text-sm">{v.stage?.name ? `[${v.stage.name}] ` : ''}{v.name}</span>
                                  {checked && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                                </label>
                              );
                            })}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-3 shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
              <Button type="submit" disabled={isPending}>
                {isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог создания стадии */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Новая стадия</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Название стадии</Label>
              <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Например: СМР" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateStage} disabled={!newStageName.trim() || createStageMut.isPending}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
