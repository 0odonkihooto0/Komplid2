'use client';

import { ObjectHeader } from '@/components/objects/ObjectHeader';
import { PhotoFolderView } from '@/components/modules/photos/PhotoFolderView';
import { useObjectContracts } from '@/components/modules/objects/useObjectContracts';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  objectId: string;
}

function ContractPhotos({ objectId }: Props) {
  const { contracts, isLoading } = useObjectContracts(objectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Нет договоров. Создайте договор — фотографии привязываются к договорам.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {contracts.map((contract) => (
        <section key={contract.id}>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {contract.number} — {contract.name}
          </p>
          <PhotoFolderView contractId={contract.id} />
        </section>
      ))}
    </div>
  );
}

export function PhotosContent({ objectId }: Props) {
  return (
    <div className="space-y-6">
      <ObjectHeader projectId={objectId} />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Фотогалерея</h2>
        <ContractPhotos objectId={objectId} />
      </div>
    </div>
  );
}
