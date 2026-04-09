'use client';

import { SafetyBriefingsView } from '@/components/modules/objects/sk/SafetyBriefingsView';

export default function SafetyBriefingsPage({ params }: { params: { objectId: string } }) {
  return <SafetyBriefingsView objectId={params.objectId} />;
}
