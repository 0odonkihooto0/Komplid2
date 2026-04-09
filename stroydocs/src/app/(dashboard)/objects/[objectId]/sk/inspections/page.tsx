'use client';

import { InspectionsView } from '@/components/modules/objects/sk/InspectionsView';

export default function InspectionsPage({ params }: { params: { objectId: string } }) {
  return <InspectionsView objectId={params.objectId} />;
}
