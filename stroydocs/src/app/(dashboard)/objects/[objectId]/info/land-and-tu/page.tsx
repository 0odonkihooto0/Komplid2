import { redirect } from 'next/navigation';

export default function LandAndTuPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/info/land-and-tu/land-plots`);
}
