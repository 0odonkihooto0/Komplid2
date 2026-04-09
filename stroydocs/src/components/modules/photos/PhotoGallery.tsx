'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { Trash2, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/utils/format';
import { PHOTO_CATEGORY_LABELS } from '@/utils/constants';
import { usePhotos, type PhotoItem } from './usePhotos';

// Fabric.js использует DOM API (DOMMatrix), несовместимые с SSR — загружаем только на клиенте
const PhotoAnnotationEditor = dynamic(
  () => import('./PhotoAnnotationEditor').then((m) => ({ default: m.PhotoAnnotationEditor })),
  { ssr: false, loading: () => null }
);

interface Props {
  entityType?: string;
  entityId?: string;
}

export function PhotoGallery({ entityType, entityId }: Props) {
  const [, startTransition] = useTransition();
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const { photos, isLoading, deletePhoto } = usePhotos(
    entityType,
    entityId,
    categoryFilter === 'ALL' ? undefined : categoryFilter
  );
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [annotatePhoto, setAnnotatePhoto] = useState<PhotoItem | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Фильтр по категории */}
      <div className="mb-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Все фото" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все фото</SelectItem>
            {Object.entries(PHOTO_CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Нет фотографий</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary"
              onClick={() => setPreviewPhoto(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.downloadUrl}
                alt={photo.fileName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {/* Бейдж категории */}
              {photo.category && (
                <div className="absolute top-1 left-1">
                  <StatusBadge
                    status={photo.category}
                    label={PHOTO_CATEGORY_LABELS[photo.category]}
                    className="text-[9px]"
                  />
                </div>
              )}
              {/* Индикатор аннотаций */}
              {!!photo.annotations && (
                <div className="absolute top-1 right-8">
                  <span className="inline-flex items-center rounded bg-blue-500/80 px-1 py-0.5 text-[9px] text-white">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(photo.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                {photo.author.lastName} · {formatDate(photo.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Полноразмерный просмотр */}
      <Dialog open={!!previewPhoto && !annotatePhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {previewPhoto && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => startTransition(() => setAnnotatePhoto(previewPhoto))}
                  title="Аннотировать"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setPreviewPhoto(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPhoto.downloadUrl}
                alt={previewPhoto.fileName}
                className="w-full max-h-[80vh] object-contain"
              />
              <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                <span>
                  {previewPhoto.author.lastName} {previewPhoto.author.firstName} ·{' '}
                  {formatDate(previewPhoto.createdAt)}
                </span>
                {previewPhoto.gpsLat && previewPhoto.gpsLng && (
                  <span>
                    GPS: {previewPhoto.gpsLat.toFixed(6)}, {previewPhoto.gpsLng.toFixed(6)}
                  </span>
                )}
                {previewPhoto.category && (
                  <StatusBadge
                    status={previewPhoto.category}
                    label={PHOTO_CATEGORY_LABELS[previewPhoto.category]}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Редактор аннотаций */}
      <Dialog open={!!annotatePhoto} onOpenChange={() => setAnnotatePhoto(null)}>
        <DialogContent className="max-w-4xl">
          {annotatePhoto && (
            <PhotoAnnotationEditor
              photoId={annotatePhoto.id}
              imageUrl={annotatePhoto.downloadUrl}
              initialAnnotations={annotatePhoto.annotations || undefined}
              onClose={() => setAnnotatePhoto(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Удалить фото?"
        description="Это действие нельзя отменить."
        onConfirm={() => {
          if (deleteId) {
            deletePhoto(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </>
  );
}
