'use client';

import { useParams } from 'next/navigation';
import { useGuestSession } from '@/components/guest/useGuestSession';
import GuestCommentsThread from '@/components/guest/GuestCommentsThread';

export default function GuestCommentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { canComment, isLoading } = useGuestSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="p-4">
      <GuestCommentsThread projectId={projectId} canComment={canComment} />
    </div>
  );
}
