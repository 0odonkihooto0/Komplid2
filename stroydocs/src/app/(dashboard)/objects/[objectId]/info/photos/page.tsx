import { PhotosContent } from '@/components/objects/photos/PhotosContent';

export const dynamic = 'force-dynamic';

export default function InfoPhotosPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <PhotosContent objectId={params.objectId} />;
}
