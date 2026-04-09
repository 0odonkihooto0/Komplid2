import { redirect } from 'next/navigation';

// Строительный контроль — редирект на вкладку «Проверки» по умолчанию
export default function SkPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/sk/inspections`);
}
