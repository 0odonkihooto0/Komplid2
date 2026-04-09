'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usePIRRegistryDetail } from '@/components/objects/pir/usePIRRegistryDetail';
import type { ExpertiseStatus, DesignDocStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const EXPERTISE_LABELS: Record<ExpertiseStatus, string> = {
  NOT_SUBMITTED:     'Не подано',
  IN_PROCESS:        'На экспертизе',
  APPROVED_POSITIVE: 'Положительное заключение',
  APPROVED_NEGATIVE: 'Отрицательное заключение',
  REVISION_REQUIRED: 'На доработку',
};

interface DesignDocOption {
  id: string;
  number: string;
  name: string;
  status: DesignDocStatus;
}

type Tab = 'documents' | 'expertise';

export default function PIRRegistryDetailPage() {
  const router = useRouter();
  const { objectId, regId } = useParams<{ objectId: string; regId: string }>();

  const { registry, isLoading, addDocMutation, removeDocMutation, updateExpertiseMutation } =
    usePIRRegistryDetail(objectId, regId);

  const [tab, setTab] = useState<Tab>('documents');
  const [selectedDocId, setSelectedDocId] = useState('');

  // Форма экспертизы — инициализируем из данных реестра при загрузке
  const [exStatus, setExStatus] = useState<ExpertiseStatus | ''>('');
  const [exDate, setExDate] = useState('');
  const [exComment, setExComment] = useState('');

  // Инициализируем форму один раз при первой загрузке реестра (не при каждом рефетче)
  useEffect(() => {
    if (registry) {
      setExStatus(registry.expertiseStatus ?? '');
      setExDate(registry.expertiseDate ? registry.expertiseDate.slice(0, 10) : '');
      setExComment(registry.expertiseComment ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry?.id]);

  // Список всех документов ПИР для добавления в реестр
  const { data: docsData } = useQuery<{ data: DesignDocOption[] }>({
    queryKey: ['design-docs', objectId, 'ALL', ''],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/design-docs?limit=200`);
      const json: { success: boolean; data: { data: DesignDocOption[] } } = await res.json();
      return json.data;
    },
    enabled: tab === 'documents',
  });

  // Документы уже в реестре (для фильтрации списка)
  const addedDocIds = new Set(registry?.items.map((i) => i.doc.id) ?? []);
  const availableDocs = (docsData?.data ?? []).filter((d) => !addedDocIds.has(d.id));

  const handleSaveExpertise = () => {
    updateExpertiseMutation.mutate({
      expertiseStatus: exStatus || null,
      expertiseDate: exDate ? new Date(exDate).toISOString() : null,
      expertiseComment: exComment.trim() || null,
    });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка реестра...</p>;
  }
  if (!registry) {
    return <p className="text-sm text-muted-foreground">Реестр не найден</p>;
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/objects/${objectId}/pir/registries`)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Назад
        </Button>
        <h2 className="text-base font-semibold">Реестр № {registry.number}</h2>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 border-b">
        {(['documents', 'expertise'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === t
                ? 'border-b-2 border-primary font-medium text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'documents' ? 'Документы' : 'Экспертиза'}
          </button>
        ))}
      </div>

      {/* Вкладка: Документы */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">№</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Номер</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Наименование</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {registry.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Нет документов. Добавьте из списка ниже.
                    </td>
                  </tr>
                )}
                {registry.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5 text-muted-foreground">{item.order}</td>
                    <td className="px-3 py-2.5 font-medium">{item.doc.number}</td>
                    <td className="px-3 py-2.5">{item.doc.name}</td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDocMutation.mutate(item.doc.id)}
                        disabled={removeDocMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Добавление документа */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Добавить документ</Label>
              <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите документ ПИР" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocs.length === 0 && (
                    <SelectItem value="" disabled>Нет доступных документов</SelectItem>
                  )}
                  {availableDocs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.number} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (selectedDocId) {
                  addDocMutation.mutate(selectedDocId, { onSuccess: () => setSelectedDocId('') });
                }
              }}
              disabled={!selectedDocId || addDocMutation.isPending}
            >
              {addDocMutation.isPending ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </div>
      )}

      {/* Вкладка: Экспертиза */}
      {tab === 'expertise' && (
        <div className="max-w-md space-y-4 rounded-md border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="exStatus">Статус экспертизы</Label>
            <Select value={exStatus} onValueChange={(v) => setExStatus(v as ExpertiseStatus | '')}>
              <SelectTrigger id="exStatus">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Не указано —</SelectItem>
                {(Object.keys(EXPERTISE_LABELS) as ExpertiseStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{EXPERTISE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exDate">Дата заключения</Label>
            <input
              id="exDate"
              type="date"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exComment">Комментарий</Label>
            <Textarea
              id="exComment"
              value={exComment}
              onChange={(e) => setExComment(e.target.value)}
              placeholder="Реквизиты заключения, замечания..."
              rows={4}
            />
          </div>

          <Button
            onClick={handleSaveExpertise}
            disabled={updateExpertiseMutation.isPending}
            size="sm"
          >
            {updateExpertiseMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      )}
    </div>
  );
}
