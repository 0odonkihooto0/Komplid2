'use client';

import { Separator } from '@/components/ui/separator';
import type { SEDDocumentFull } from './useSEDDocumentCard';

interface SEDInfoTabProps {
  doc: SEDDocumentFull;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  LETTER: 'Письмо',
  ORDER: 'Приказ',
  PROTOCOL: 'Протокол',
  ACT: 'Акт',
  MEMO: 'Докладная',
  NOTIFICATION: 'Уведомление',
  OTHER: 'Иное',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU');
}

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function SEDInfoTab({ doc }: SEDInfoTabProps) {
  const senderUserName = doc.senderUser
    ? `${doc.senderUser.lastName} ${doc.senderUser.firstName}`
    : null;
  const receiverUserName = doc.receiverUser
    ? `${doc.receiverUser.lastName} ${doc.receiverUser.firstName}`
    : null;
  const authorName = `${doc.author.lastName} ${doc.author.firstName}`;
  const senderOrgValue = doc.senderOrg.inn
    ? `${doc.senderOrg.name} (ИНН: ${doc.senderOrg.inn})`
    : doc.senderOrg.name;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Номер" value={doc.number} />
        <Field label="Дата" value={doc.date ? formatDate(doc.date) : formatDate(doc.createdAt)} />
        <Field label="Тип" value={DOC_TYPE_LABELS[doc.docType] ?? doc.docType} />
        <Field label="Автор" value={authorName} />
        <Field label="Отправитель (орг.)" value={senderOrgValue} />
        {doc.receiverOrg && (
          <Field
            label="Получатель (орг.)"
            value={
              doc.receiverOrg.inn
                ? `${doc.receiverOrg.name} (ИНН: ${doc.receiverOrg.inn})`
                : doc.receiverOrg.name
            }
          />
        )}
        {senderUserName && <Field label="Отправитель (лицо)" value={senderUserName} />}
        {receiverUserName && <Field label="Получатель (лицо)" value={receiverUserName} />}
        {doc.incomingNumber && <Field label="Входящий номер" value={doc.incomingNumber} />}
        {doc.outgoingNumber && <Field label="Исходящий номер" value={doc.outgoingNumber} />}
      </dl>

      {doc.body && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Текст документа</p>
            <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
              {doc.body}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
