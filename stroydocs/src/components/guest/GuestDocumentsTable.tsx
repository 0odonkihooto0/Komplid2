'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SignDocumentWizard } from '@/components/guest/SignDocumentWizard';

interface GuestDocument {
  id: string;
  type: string;
  title: string;
  number: string | null;
  status: string;
  createdAt: string;
  qrToken: string | null;
}

interface DocumentsResponse {
  items: GuestDocument[];
  total: number;
}

// Метки статусов документов на русском
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На проверке',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
};

interface Props {
  projectId: string;
  canSign: boolean;
}

export default function GuestDocumentsTable({ projectId, canSign }: Props) {
  const [signingDoc, setSigningDoc] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading } = useQuery<DocumentsResponse>({
    queryKey: ['guest-documents', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/guest/projects/${projectId}/documents`);
      const json = await res.json() as { success: boolean; data: DocumentsResponse; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки документов');
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка документов...</p>;
  }

  const documents = data?.items ?? [];

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Документы отсутствуют.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Документы</h2>
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                {canSign && <TableHead className="text-right">Действия</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {doc.title}{doc.number ? ` №${doc.number}` : ''}
                  </TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{STATUS_LABELS[doc.status] ?? doc.status}</TableCell>
                  <TableCell>
                    {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  {canSign && (
                    <TableCell className="text-right">
                      {/* Кнопка подписания показывается только для документов на проверке */}
                      {doc.status === 'IN_REVIEW' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSigningDoc({ id: doc.id, title: doc.title })}
                        >
                          Подписать
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Диалог подписания документа */}
      {signingDoc && (
        <SignDocumentWizard
          docId={signingDoc.id}
          docTitle={signingDoc.title}
          onClose={() => setSigningDoc(null)}
          onSuccess={() => setSigningDoc(null)}
        />
      )}
    </>
  );
}
