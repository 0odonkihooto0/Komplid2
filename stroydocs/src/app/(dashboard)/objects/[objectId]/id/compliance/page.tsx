import { CompliancePage } from '@/components/compliance/CompliancePage';

export const dynamic = 'force-dynamic';

export default function ObjectIdCompliancePage({
  params,
}: {
  params: { objectId: string };
}) {
  return <CompliancePage objectId={params.objectId} />;
}
