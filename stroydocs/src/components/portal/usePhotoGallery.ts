// Хук для постраничной загрузки фотоматериалов публичного портала
import { useInfiniteQuery } from '@tanstack/react-query';

interface PhotoItem {
  id: string;
  downloadUrl: string;
  takenAt?: string;
}

interface PhotoPage {
  items: PhotoItem[];
  nextCursor?: string;
}

export function usePhotoGallery(token: string) {
  return useInfiniteQuery({
    queryKey: ['portal-photos', token],
    queryFn: async ({ pageParam }): Promise<PhotoPage> => {
      const cursor = pageParam as string | undefined;
      const url = `/api/portal/${token}/photos?limit=12${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки фото');
      const json = await res.json() as { success: boolean; data: PhotoPage };
      return json.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
  });
}
