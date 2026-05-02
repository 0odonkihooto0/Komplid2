'use client';

import { useParams } from 'next/navigation';
import { useGuestSession } from '@/components/guest/useGuestSession';
import GuestDocumentsTable from '@/components/guest/GuestDocumentsTable';

export default function GuestDocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { canSignActs, isLoading } = useGuestSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="p-4">
      <GuestDocumentsTable projectId={projectId} canSign={canSignActs} />
    </div>
  );
}
