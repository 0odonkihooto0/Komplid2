'use client';

import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

interface Props {
  objectId: string;
  contractId: string;
}

/** Реестры ИД — управление реестрами исполнительной документации по договору */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IdRegistriesView({ objectId, contractId }: Props) {
  return (
    <EmptyState
      icon={<BookOpen className="h-12 w-12" />}
      title="Реестры ИД"
      description="Раздел находится в разработке. Здесь будет доступно управление реестрами исполнительной документации по договору."
    />
  );
}
