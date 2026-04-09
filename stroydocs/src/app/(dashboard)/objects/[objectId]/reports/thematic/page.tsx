import { ThematicReportsMenu } from '@/components/objects/reports/ThematicReportsMenu';

export const dynamic = 'force-dynamic';

export default function ThematicReportsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ThematicReportsMenu objectId={params.objectId} />;
}
