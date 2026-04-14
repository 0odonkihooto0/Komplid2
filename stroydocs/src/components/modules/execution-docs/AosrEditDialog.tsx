'use client';

import { useForm } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAosrEdit } from './useAosrEdit';
import { SavedFieldInput } from './SavedFieldInput';
import type { ExecutionDocStatus } from '@prisma/client';

// Поля с автодополнением (2,3,4,6,7 АОСР — участники строительства)
const AUTOCOMPLETE_FIELDS = new Set(['zakazchik', 'stroiteli', 'projectirovshik', 'stroiteli11', 'stroiteli3']);

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  contractId: string;
  docId: string;
  docStatus: ExecutionDocStatus;
  currentOverrideFields?: Record<string, string> | null;
}

type Fields = Record<string, string>;

const field = (name: string, label: string, multiline?: boolean) => ({ name, label, multiline });

const PARTICIPANT_FIELDS = [
  field('zakazchik', 'Застройщик (реквизиты организации)'),
  field('stroiteli', 'Подрядчик (реквизиты организации)'),
  field('projectirovshik', 'Авторнадзор (реквизиты организации)'),
  field('stroiteli11', 'Представитель подрядчика (должность, ФИО, приказ)'),
  field('stroiteli12', 'Представитель стройконтроля (должность, ФИО, приказ)'),
  field('stroiteli3', 'Представитель исполнителя (должность, ФИО, приказ)'),
  field('projectirovshik1', 'Представитель авторнадзора (должность, ФИО, приказ)'),
];

const WORK_FIELDS = [
  field('rabota', 'Наименование работ', true),
  field('project', 'Шифр раздела проектной документации'),
  field('material', 'Применяемые материалы', true),
  field('shema', 'Исполнительная схема'),
  field('ispitaniya', 'Испытания и протоколы'),
  field('SNIP', 'Нормативные документы (СНиП, СП, ГОСТ)'),
];

const DATE_FIELDS = [
  field('№', 'Номер акта'),
  field('D1', 'День начала работ'), field('M1', 'Месяц начала'), field('Y1', 'Год начала'),
  field('D2', 'День окончания работ'), field('M2', 'Месяц окончания'), field('Y2', 'Год окончания'),
  field('D', 'День составления акта'), field('M', 'Месяц составления'), field('Y', 'Год составления'),
];

const OTHER_FIELDS = [
  field('Next', 'Разрешается производство работ'),
  field('N', 'Количество экземпляров'),
  field('DOP', 'Приложения', true),
  field('zakazchik2', 'ФИО застройщика (подпись)'),
  field('stroiteli21', 'ФИО подрядчика (подпись)'),
  field('stroiteli22', 'ФИО стройконтроля (подпись)'),
  field('projectirovshik2', 'ФИО авторнадзора (подпись)'),
  field('stroiteli32', 'ФИО исполнителя (подпись)'),
];

function FieldGroup({ fields, register, isReadOnly, projectId, watch, setValue }: {
  fields: ReturnType<typeof field>[];
  register: ReturnType<typeof useForm<Fields>>['register'];
  isReadOnly: boolean;
  projectId?: string;
  watch?: ReturnType<typeof useForm<Fields>>['watch'];
  setValue?: ReturnType<typeof useForm<Fields>>['setValue'];
}) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1">
          <Label htmlFor={f.name} className="text-xs">{f.label}</Label>
          {f.multiline ? (
            <Textarea id={f.name} rows={2} disabled={isReadOnly} {...register(f.name)} />
          ) : projectId && AUTOCOMPLETE_FIELDS.has(f.name) && watch && setValue ? (
            <SavedFieldInput
              id={f.name}
              name={f.name}
              value={watch(f.name) ?? ''}
              onChange={(v) => setValue(f.name, v)}
              projectId={projectId}
              disabled={isReadOnly}
            />
          ) : (
            <Input id={f.name} disabled={isReadOnly} {...register(f.name)} />
          )}
        </div>
      ))}
    </div>
  );
}

export function AosrEditDialog({ open, onClose, projectId, contractId, docId, docStatus, currentOverrideFields }: Props) {
  const { saveAndRegenerate, isPending } = useAosrEdit(projectId, contractId, docId);
  const isReadOnly = docStatus === 'SIGNED';
  const isInReview = docStatus === 'IN_REVIEW';

  const allFields = [...PARTICIPANT_FIELDS, ...WORK_FIELDS, ...DATE_FIELDS, ...OTHER_FIELDS];
  const defaultValues = Object.fromEntries(allFields.map((f) => [f.name, currentOverrideFields?.[f.name] ?? '']));
  const { register, handleSubmit, watch, setValue } = useForm<Fields>({ defaultValues });

  const onSubmit = async (data: Fields) => {
    const nonEmpty = Object.fromEntries(Object.entries(data).filter(([, v]) => v.trim() !== ''));
    await saveAndRegenerate(nonEmpty);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать поля АОСР</DialogTitle>
        </DialogHeader>
        {isReadOnly && (
          <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Документ подписан — редактирование недоступно.</AlertDescription></Alert>
        )}
        {isInReview && !isReadOnly && (
          <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Статус «На проверке» — согласование не сбрасывается при сохранении.</AlertDescription></Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="participants">
            <TabsList className="w-full">
              <TabsTrigger value="participants">Участники</TabsTrigger>
              <TabsTrigger value="work">Работы</TabsTrigger>
              <TabsTrigger value="dates">Даты</TabsTrigger>
              <TabsTrigger value="other">Прочее</TabsTrigger>
            </TabsList>
            <TabsContent value="participants" className="pt-3"><FieldGroup fields={PARTICIPANT_FIELDS} register={register} isReadOnly={isReadOnly} projectId={projectId} watch={watch} setValue={setValue} /></TabsContent>
            <TabsContent value="work" className="pt-3"><FieldGroup fields={WORK_FIELDS} register={register} isReadOnly={isReadOnly} /></TabsContent>
            <TabsContent value="dates" className="pt-3"><FieldGroup fields={DATE_FIELDS} register={register} isReadOnly={isReadOnly} /></TabsContent>
            <TabsContent value="other" className="pt-3"><FieldGroup fields={OTHER_FIELDS} register={register} isReadOnly={isReadOnly} /></TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            {!isReadOnly && (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Сохранить и перегенерировать PDF'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
