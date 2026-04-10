'use client';

import type { SEDDocumentFull } from './useSEDDocumentCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Paperclip, Download } from 'lucide-react';

// ---- Вспомогательные функции ----

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
}

// ---- Типы ----

interface SEDDocSidebarProps {
  doc: SEDDocumentFull;
  objectId: string;
}

// ---- Компонент ----

export function SEDDocSidebar({ doc, objectId: _objectId }: SEDDocSidebarProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Блок «Инфо» */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Инфо
        </h4>

        {/* Тэги */}
        {doc.tags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Тэги</p>
            <div className="flex flex-wrap gap-1">
              {doc.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Наблюдатели */}
        {doc.observers.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Наблюдатели ({doc.observers.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {doc.observers.map((_id, idx) => (
                <div
                  key={_id}
                  className="h-7 w-7 rounded-full bg-muted border flex items-center justify-center text-xs font-medium"
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Блок «Автор» */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Автор
        </h4>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {getInitials(doc.author.firstName, doc.author.lastName)}
          </div>
          <span className="text-sm">
            {doc.author.lastName} {doc.author.firstName}
          </span>
        </div>
      </div>

      <Separator />

      {/* Блок «Сроки» */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Сроки
        </h4>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Создано</dt>
            <dd>{new Date(doc.createdAt).toLocaleDateString('ru-RU')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Отправлено</dt>
            <dd>
              {doc.workflows[0]?.sentAt
                ? new Date(doc.workflows[0].sentAt).toLocaleDateString('ru-RU')
                : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Отвечено</dt>
            <dd>
              {doc.workflows[0]?.completedAt
                ? new Date(doc.workflows[0].completedAt).toLocaleDateString('ru-RU')
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <Separator />

      {/* Блок «Прикреплённые файлы» */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Файлы {doc.attachments.length > 0 && `(${doc.attachments.length})`}
        </h4>
        {doc.attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет прикреплённых файлов</p>
        ) : (
          <ul className="space-y-1.5">
            {doc.attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 text-xs">
                <Paperclip
                  className="h-3 w-3 shrink-0 text-muted-foreground"
                  aria-label="Файл"
                />
                <span className="flex-1 truncate">{att.fileName}</span>
                <span className="text-muted-foreground shrink-0">{formatBytes(att.size)}</span>
                <a href={`/api/files/${att.s3Key}`} download={att.fileName} className="shrink-0">
                  <Download
                    className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                    aria-label="Скачать"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
