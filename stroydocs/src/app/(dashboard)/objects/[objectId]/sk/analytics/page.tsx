'use client';

import { SkAnalyticsView } from '@/components/modules/objects/sk/SkAnalyticsView';

export const dynamic = 'force-dynamic';

export default function SkAnalyticsPage({ params }: { params: { objectId: string } }) {
  return <SkAnalyticsView objectId={params.objectId} />;
}
