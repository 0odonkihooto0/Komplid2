import { FundingView } from '@/components/objects/funding/FundingView';

export const dynamic = 'force-dynamic';

export default function InfoFundingPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <FundingView projectId={params.objectId} />;
}
