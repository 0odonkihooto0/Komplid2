export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CustomerMaterialsTable from '@/components/customer/CustomerMaterialsTable';

interface Props {
  params: { projectId: string };
}

export default function MaterialsPage({ params }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/moy-remont/projects/${params.projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">Трекер материалов</h1>
      </div>
      <CustomerMaterialsTable projectId={params.projectId} />
    </div>
  );
}
