import { ReportsView } from '@/components/objects/reports/ReportsView';

export const dynamic = 'force-dynamic';

export default function ReportsListPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ReportsView objectId={params.objectId} />;
}
