export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import NewClaimWizard from '@/components/customer/NewClaimWizard';

interface Props {
  params: { projectId: string };
}

export default function NewClaimPage({ params }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/moy-remont/projects/${params.projectId}/claims`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Создать претензию</h1>
      </div>
      <NewClaimWizard projectId={params.projectId} />
    </div>
  );
}
