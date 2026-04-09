import { ThematicReportView } from '@/components/objects/reports/ThematicReportView';

export const dynamic = 'force-dynamic';

export default function ThematicReportSlugPage({
  params,
}: {
  params: { objectId: string; slug: string };
}) {
  return <ThematicReportView objectId={params.objectId} slug={params.slug} />;
}
