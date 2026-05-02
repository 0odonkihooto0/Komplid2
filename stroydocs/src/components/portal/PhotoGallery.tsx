'use client';

// Фотогалерея с infinite scroll и lightbox для публичного портала
import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePhotoGallery } from './usePhotoGallery';

interface PhotoGalleryProps {
  token: string;
  hideGps?: boolean;
}

export function PhotoGallery({ token }: PhotoGalleryProps) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    usePhotoGallery(token);

  // Выбранное фото для lightbox
  const [selected, setSelected] = useState<{ url: string; takenAt?: string } | null>(null);

  // Ref для sentinel-элемента infinite scroll
  const observerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer для автоподгрузки при прокрутке вниз
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Все загруженные фото из всех страниц
  const allPhotos = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Фотоматериалы</h2>

      {/* Skeleton при первичной загрузке */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-md" />
          ))}
        </div>
      )}

      {/* Сетка фотографий */}
      {allPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {allPhotos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelected({ url: photo.downloadUrl, takenAt: photo.takenAt })}
              className="block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
              aria-label="Открыть фото"
            >
              <img
                src={photo.downloadUrl}
                alt=""
                className="object-cover aspect-square w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
              />
            </button>
          ))}
        </div>
      )}

      {/* Sentinel для Intersection Observer */}
      <div ref={observerRef} className="h-1" />

      {/* Кнопка ручной подгрузки пока идёт запрос */}
      {isFetchingNextPage && (
        <p className="text-center text-sm text-gray-400 animate-pulse">Загрузка фото...</p>
      )}

      {/* Lightbox */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selected && (
            <div className="space-y-2">
              <img
                src={selected.url}
                alt=""
                className="w-full max-h-[70vh] object-contain rounded-md"
              />
              {selected.takenAt && (
                <p className="text-xs text-center text-gray-400">
                  Снято:{' '}
                  {new Date(selected.takenAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
