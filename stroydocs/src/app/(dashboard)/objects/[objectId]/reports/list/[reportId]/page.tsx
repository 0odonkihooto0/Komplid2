import { ReportCard } from '@/components/objects/reports/ReportCard';

export const dynamic = 'force-dynamic';

export default function ReportCardPage({
  params,
}: {
  params: { objectId: string; reportId: string };
}) {
  return <ReportCard objectId={params.objectId} reportId={params.reportId} />;
}
