'use client';

import { useMemo } from 'react';
import { usePhotos, type PhotoItem } from './usePhotos';
import { formatDate } from '@/utils/format';

export interface PhotoFolder {
  name: string;
  photos: PhotoItem[];
  byDate: Array<{ date: string; photos: PhotoItem[] }>;
}

function groupByDate(photos: PhotoItem[]): Array<{ date: string; photos: PhotoItem[] }> {
  const map = new Map<string, PhotoItem[]>();
  for (const p of photos) {
    const date = p.takenAt ? formatDate(p.takenAt) : formatDate(p.createdAt);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(p);
  }
  // Сортируем даты по убыванию
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, photos]) => ({ date, photos }));
}

export function usePhotoFolders(contractId: string) {
  const { photos, isLoading, deletePhoto } = usePhotos(undefined, undefined, undefined, contractId);

  const folders = useMemo<PhotoFolder[]>(() => {
    const map = new Map<string, PhotoItem[]>();

    for (const p of photos) {
      const folderName =
        p.entityType === 'WORK_RECORD' && p.workItemName
          ? p.workItemName
          : 'Общие фото договора';
      if (!map.has(folderName)) map.set(folderName, []);
      map.get(folderName)!.push(p);
    }

    // Сортировка: сначала виды работ (по алфавиту), «Общие» — в конце
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'Общие фото договора') return 1;
      if (b === 'Общие фото договора') return -1;
      return a.localeCompare(b, 'ru');
    });

    return entries.map(([name, photos]) => ({
      name,
      photos,
      byDate: groupByDate([...photos].sort(
        (a, b) => new Date(b.takenAt ?? b.createdAt).getTime() - new Date(a.takenAt ?? a.createdAt).getTime()
      )),
    }));
  }, [photos]);

  return { folders, isLoading, deletePhoto };
}
