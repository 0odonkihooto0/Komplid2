'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUploadVersion } from './useModelViewer';
import { useDeleteModel } from './useModels';
import type { BimModelDetail, BimModelVersion } from './useModelViewer';

interface Props {
  model: BimModelDetail;
  projectId: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function VersionRow({ version }: { version: BimModelVersion }) {
  return (
    <div className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">v{version.version}</span>
          {version.isCurrent && <Badge variant="secondary" className="h-4 px-1 text-[10px]">активная</Badge>}
        </div>
        <div className="truncate text-muted-foreground">
          {version.uploadedBy?.name ?? '—'} · {formatDate(version.createdAt)} · {formatBytes(version.fileSize)}
        </div>
        {version.comment && (
          <div className="truncate text-muted-foreground">{version.comment}</div>
        )}
      </div>
    </div>
  );
}

export function ModelFilesTab({ model, projectId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadVersion = useUploadVersion(projectId, model.id);
  const deleteModel = useDeleteModel(projectId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadVersion.mutateAsync({
        file,
        name: `Версия ${(model.versions.length ?? 0) + 1}`,
        setAsCurrent: true,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = () => {
    if (!confirm(`Удалить модель «${model.name}»? Это действие необратимо.`)) return;
    deleteModel.mutate(model.id, { onSuccess: () => router.back() });
  };

  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      {/* Действия */}
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => window.open(model.downloadUrl, '_blank')}
        >
          <Download className="h-3.5 w-3.5" />
          Скачать текущую версию
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Загрузить новую версию
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".ifc,.ifczip,.ifcxml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* История версий */}
      {model.versions.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            История версий
          </p>
          {model.versions.map((v) => <VersionRow key={v.id} version={v} />)}
        </div>
      )}

      {/* Удаление */}
      <div className="mt-auto border-t pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-destructive hover:text-destructive"
          disabled={deleteModel.isPending}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Удалить модель
        </Button>
      </div>
    </div>
  );
}
