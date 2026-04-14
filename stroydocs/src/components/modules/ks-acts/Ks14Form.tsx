'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { KsActParticipantsSection } from './KsActParticipantsSection';
import { KsActIndicatorsSection } from './KsActIndicatorsSection';
import { KsActWorkListSection } from './KsActWorkListSection';
import { KsActCommissionSection } from './KsActCommissionSection';
import { useUpdateKsAct, useAutofillParticipants } from './useKsActForm';
import type {
  KsActFormFields,
  KsActParticipant,
  KsActIndicator,
  KsActWorkItem,
  KsActCommissionMember,
} from './useKsActForm';

interface FormValues {
  designOrg: string;
  designOrgInn: string;
  objectDesc: string;
  totalArea: string;
  buildingVolume: string;
  floorCount: string;
  constructionClass: string;
  startDate: string;
  endDate: string;
  deviations: string;
  constructionCost: string;
  actualCost: string;
  documents: string;
  conclusion: string;
}

interface Props {
  actId: string;
  objectId: string;
  contractId: string;
  formData: KsActFormFields | null;
}

function toStr(v: number | null | undefined): string {
  return v != null ? String(v) : '';
}

export function Ks14Form({ actId, objectId, contractId, formData }: Props) {
  // Все хуки — до любых ранних return (правила хуков React)
  const [commissionMembers, setCommissionMembers] = useState<KsActCommissionMember[]>(
    Array.isArray(formData?.commissionMembers) ? (formData.commissionMembers as KsActCommissionMember[]) : [],
  );
  const [participants, setParticipants] = useState<KsActParticipant[]>(
    Array.isArray(formData?.participants) ? (formData.participants as KsActParticipant[]) : [],
  );
  const [indicators, setIndicators] = useState<KsActIndicator[]>(
    Array.isArray(formData?.indicators) ? (formData.indicators as KsActIndicator[]) : [],
  );
  const [workList, setWorkList] = useState<KsActWorkItem[]>(
    Array.isArray(formData?.workList) ? (formData.workList as KsActWorkItem[]) : [],
  );

  const updateMutation = useUpdateKsAct(objectId, contractId);
  const autofillMutation = useAutofillParticipants(objectId, contractId);

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      designOrg: formData?.designOrg ?? '',
      designOrgInn: formData?.designOrgInn ?? '',
      objectDesc: formData?.objectDesc ?? '',
      totalArea: toStr(formData?.totalArea),
      buildingVolume: toStr(formData?.buildingVolume),
      floorCount: toStr(formData?.floorCount),
      constructionClass: formData?.constructionClass ?? '',
      startDate: formData?.startDate?.slice(0, 10) ?? '',
      endDate: formData?.endDate?.slice(0, 10) ?? '',
      deviations: formData?.deviations ?? '',
      constructionCost: toStr(formData?.constructionCost),
      actualCost: toStr(formData?.actualCost),
      documents: formData?.documents ?? '',
      conclusion: formData?.conclusion ?? '',
    },
  });

  const onSubmit = (values: FormValues) => {
    const data: KsActFormFields = {
      designOrg: values.designOrg || null,
      designOrgInn: values.designOrgInn || null,
      objectDesc: values.objectDesc || null,
      totalArea: values.totalArea ? parseFloat(values.totalArea) : null,
      buildingVolume: values.buildingVolume ? parseFloat(values.buildingVolume) : null,
      floorCount: values.floorCount ? parseInt(values.floorCount, 10) : null,
      constructionClass: values.constructionClass || null,
      startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
      endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
      deviations: values.deviations || null,
      constructionCost: values.constructionCost ? parseFloat(values.constructionCost) : null,
      actualCost: values.actualCost ? parseFloat(values.actualCost) : null,
      documents: values.documents || null,
      conclusion: values.conclusion || null,
      participants,
      indicators,
      workList,
      commissionMembers,
    };
    updateMutation.mutate({ actId, data });
  };

  const handleAutofill = async () => {
    const result = await autofillMutation.mutateAsync(actId);
    setParticipants(result);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">

      {/* КС-14: Состав приёмочной комиссии */}
      <KsActCommissionSection members={commissionMembers} onChange={setCommissionMembers} />

      <Separator />

      {/* п.3 — Проектная организация */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          П.3 — Проектная организация
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Наименование</Label>
            <Input {...register('designOrg')} placeholder="ООО Проект" />
          </div>
          <div className="space-y-1.5">
            <Label>ИНН</Label>
            <Input {...register('designOrgInn')} placeholder="7701234567" />
          </div>
        </div>
      </div>

      <Separator />

      {/* п.7 — Краткая характеристика объекта */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          П.7 — Краткая характеристика объекта
        </h4>
        <div className="space-y-1.5">
          <Label>Описание объекта</Label>
          <Textarea {...register('objectDesc')} rows={3} placeholder="Многоквартирный жилой дом..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Общая площадь, м²</Label>
            <Input {...register('totalArea')} type="number" step="0.01" placeholder="5000" />
          </div>
          <div className="space-y-1.5">
            <Label>Строительный объём, м³</Label>
            <Input {...register('buildingVolume')} type="number" step="0.01" placeholder="15000" />
          </div>
          <div className="space-y-1.5">
            <Label>Количество этажей</Label>
            <Input {...register('floorCount')} type="number" placeholder="9" />
          </div>
          <div className="space-y-1.5">
            <Label>Класс ответственности</Label>
            <Input {...register('constructionClass')} placeholder="КС-2 (Нормальный)" />
          </div>
        </div>
      </div>

      <Separator />

      {/* пп.9-11 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          ПП.9-11 — Сроки и отклонения
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Дата начала строительства (п.9)</Label>
            <Input {...register('startDate')} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Дата окончания строительства (п.9)</Label>
            <Input {...register('endDate')} type="date" />
          </div>
        </div>
        <KsActIndicatorsSection indicators={indicators} onChange={setIndicators} />
        <div className="space-y-1.5">
          <Label>Отклонения от проекта и принятые решения (п.11)</Label>
          <Textarea {...register('deviations')} rows={3} placeholder="Отклонений нет / Перечислить отклонения..." />
        </div>
      </div>

      <Separator />

      {/* п.12 — Стоимость */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          П.12 — Стоимость строительства, руб.
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>По смете</Label>
            <Input {...register('constructionCost')} type="number" step="0.01" placeholder="10000000" />
          </div>
          <div className="space-y-1.5">
            <Label>Фактическая</Label>
            <Input {...register('actualCost')} type="number" step="0.01" placeholder="9800000" />
          </div>
        </div>
      </div>

      <Separator />

      {/* п.13 — Участники */}
      <KsActParticipantsSection
        participants={participants}
        onChange={setParticipants}
        onAutofill={handleAutofill}
        isAutofilling={autofillMutation.isPending}
      />

      <Separator />

      {/* п.10 — Перечень работ */}
      <KsActWorkListSection workList={workList} onChange={setWorkList} />

      <Separator />

      {/* пп.14-15 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          ПП.14-15 — Документы и заключение
        </h4>
        <div className="space-y-1.5">
          <Label>Перечень прилагаемых документов (п.14)</Label>
          <Textarea {...register('documents')} rows={3} placeholder="1. Разрешение на строительство\n2. Проектная документация..." />
        </div>
        <div className="space-y-1.5">
          <Label>Заключение (п.15)</Label>
          <Textarea {...register('conclusion')} rows={3} placeholder="Объект соответствует требованиям нормативной документации..." />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Сохранение...</>
            : 'Сохранить форму'}
        </Button>
      </div>
    </form>
  );
}
