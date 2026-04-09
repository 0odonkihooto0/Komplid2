'use client';

import type { WorkRecord } from './useWorkRecords';

interface Props {
  writeoffs: WorkRecord['writeoffs'];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CERTIFICATE: 'Сертификат',
  PASSPORT: 'Паспорт',
  OTHER: 'Документ',
};

export function MaterialDocsList({ writeoffs }: Props) {
  if (writeoffs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Нет списаний материалов</p>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {writeoffs.map((wo) => (
        <div key={wo.id}>
          <p className="text-xs font-medium mb-1">{wo.material.name}</p>
          {wo.material.documents.length > 0 ? (
            <div className="space-y-0.5 ml-2">
              {wo.material.documents.map((doc) => (
                doc.downloadUrl ? (
                  <a
                    key={doc.id}
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    📎 {doc.fileName} ({DOC_TYPE_LABELS[doc.type] ?? doc.type})
                  </a>
                ) : (
                  <span key={doc.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                    📎 {doc.fileName} ({DOC_TYPE_LABELS[doc.type] ?? doc.type})
                  </span>
                )
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground ml-2">Нет документов</span>
          )}
        </div>
      ))}
    </div>
  );
}
