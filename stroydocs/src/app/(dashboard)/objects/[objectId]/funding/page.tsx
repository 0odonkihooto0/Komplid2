import { redirect } from 'next/navigation';

export default function FundingPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/info/funding`);
}
