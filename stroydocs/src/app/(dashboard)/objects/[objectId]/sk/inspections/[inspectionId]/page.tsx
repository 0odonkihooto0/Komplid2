'use client';

import { InspectionCard } from '@/components/modules/objects/sk/InspectionCard';

export default function InspectionDetailPage({
  params,
}: {
  params: { objectId: string; inspectionId: string };
}) {
  return <InspectionCard objectId={params.objectId} inspectionId={params.inspectionId} />;
}
