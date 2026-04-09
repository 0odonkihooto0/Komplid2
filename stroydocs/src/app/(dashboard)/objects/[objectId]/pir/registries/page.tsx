import { PIRRegistryList } from '@/components/objects/pir/PIRRegistryList';

export const dynamic = 'force-dynamic';

export default function PIRRegistriesPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <PIRRegistryList objectId={params.objectId} />;
}
