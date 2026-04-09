'use client';

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { usePhotoFolders } from './usePhotoFolders';
import type { PhotoItem } from './usePhotos';

interface Props {
  contractId: string;
}

export function PhotoFolderView({ contractId }: Props) {
  const { folders, isLoading } = usePhotoFolders(contractId);
  const [preview, setPreview] = useState<PhotoItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Нет фотографий
      </p>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {folders.map((folder) => (
          <div key={folder.name}>
            {/* Заголовок папки */}
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span className="font-medium text-sm">{folder.name}</span>
              <Badge variant="secondary" className="text-xs">{folder.photos.length}</Badge>
            </div>

            {/* Группы по датам */}
            <div className="space-y-3 ml-6">
              {folder.byDate.map(({ date, photos }) => (
                <div key={date}>
                  <p className="text-xs text-muted-foreground mb-1.5">{date}</p>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="relative w-20 h-20 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary cursor-pointer flex-shrink-0"
                        onClick={() => setPreview(photo)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.downloadUrl}
                          alt={photo.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[9px] text-white truncate">
                          {photo.author.lastName}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Предпросмотр фото */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {preview && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.downloadUrl}
                alt={preview.fileName}
                className="w-full max-h-[80vh] object-contain"
              />
              <div className="p-3 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>
                  {preview.author.lastName} {preview.author.firstName} ·{' '}
                  {formatDate(preview.takenAt ?? preview.createdAt)}
                </span>
                {preview.gpsLat && preview.gpsLng && (
                  <span className="text-xs">
                    📍 {preview.gpsLat.toFixed(5)}, {preview.gpsLng.toFixed(5)}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
