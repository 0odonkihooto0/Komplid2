'use client';

import Link from 'next/link';
import { ArrowLeft, FileDown, Wand2, FilePlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useKs2Detail } from '@/components/modules/ks2/useKs2';
import { formatDate } from '@/utils/format';

const STATUS_CONFIG = {
  DRAFT: { label: 'Черновик', className: 'bg-gray-100 text-gray-800' },
  IN_REVIEW: { label: 'На согласовании', className: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Утверждён', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Отклонён', className: 'bg-red-100 text-red-800' },
};

interface Props {
  projectId: string;
  contractId: string;
  ks2Id: string;
}

/** Страница детального просмотра акта КС-2 */
export function Ks2DetailContent({ projectId, contractId, ks2Id }: Props) {
  const { act, isLoading, autofillMutation, generatePdfMutation, generateKs3Mutation, generateKs3PdfMutation } =
    useKs2Detail(projectId, contractId, ks2Id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!act) {
    return <p className="text-muted-foreground">Акт не найден</p>;
  }

  const statusConfig = STATUS_CONFIG[act.status];

  return (
    <div className="space-y-6">
      <Link
        href={`/objects/${projectId}/contracts/${contractId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Назад к договору
      </Link>

      {/* Шапка */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Акт КС-2 № {act.number}</h1>
          <div className="mt-2 flex items-center gap-3">
            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
            <span className="text-sm text-muted-foreground">
              Период: {formatDate(act.periodStart)} — {formatDate(act.periodEnd)}
            </span>
          </div>
          <p className="mt-1 text-sm">
            Итого: <strong>{act.totalAmount.toLocaleString('ru-RU')} руб.</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {act.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => autofillMutation.mutate()}
              disabled={autofillMutation.isPending}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {autofillMutation.isPending ? 'Заполнение...' : 'Заполнить из сметы'}
            </Button>
          )}
          {!act.s3Key && (
            <Button
              size="sm"
              onClick={() => generatePdfMutation.mutate()}
              disabled={generatePdfMutation.isPending}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {generatePdfMutation.isPending ? 'Генерация...' : 'Сгенерировать PDF'}
            </Button>
          )}
          {!act.ks3Certificate && act.items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateKs3Mutation.mutate()}
              disabled={generateKs3Mutation.isPending}
            >
              <FilePlus className="mr-2 h-4 w-4" />
              {generateKs3Mutation.isPending ? 'Создание...' : 'Создать КС-3'}
            </Button>
          )}
          {act.ks3Certificate && !act.ks3Certificate.s3Key && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateKs3PdfMutation.mutate()}
              disabled={generateKs3PdfMutation.isPending}
            >
              <FileText className="mr-2 h-4 w-4" />
              {generateKs3PdfMutation.isPending ? 'Генерация КС-3...' : 'PDF КС-3'}
            </Button>
          )}
        </div>
      </div>

      {/* Таблица позиций */}
      <div>
        <h2 className="mb-3 text-base font-medium">Позиции акта ({act.items.length})</h2>
        {act.items.length === 0 ? (
          <div className="rounded-md border bg-muted/50 py-8 text-center text-sm text-muted-foreground">
            Нет позиций. Нажмите «Заполнить из сметы» или добавьте вручную.
          </div>
        ) : (
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">№</th>
                  <th className="px-3 py-2 text-left font-medium">Наименование</th>
                  <th className="px-3 py-2 text-center font-medium">Ед.изм.</th>
                  <th className="px-3 py-2 text-right font-medium">Кол-во</th>
                  <th className="px-3 py-2 text-right font-medium">Цена, руб.</th>
                  <th className="px-3 py-2 text-right font-medium">Сумма, руб.</th>
                </tr>
              </thead>
              <tbody>
                {act.items.map((item, idx) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2">
                      {item.name}
                      {item.workItem && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          [{item.workItem.projectCipher}]
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">{item.unit}</td>
                    <td className="px-3 py-2 text-right">{item.volume}</td>
                    <td className="px-3 py-2 text-right">{item.unitPrice.toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {item.totalPrice.toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/50">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right font-medium">ИТОГО:</td>
                  <td className="px-3 py-2 text-right font-bold">
                    {act.totalAmount.toLocaleString('ru-RU')} руб.
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* КС-3 статус */}
      {act.ks3Certificate && (
        <div className="rounded-md border bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            КС-3 создана. Статус: {act.ks3Certificate.status === 'DRAFT' ? 'Черновик' : act.ks3Certificate.status}
          </p>
        </div>
      )}
    </div>
  );
}
