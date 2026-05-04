import { Suspense } from 'react';
import CustomerDashboard from '@/components/customer/CustomerDashboard';

export const dynamic = 'force-dynamic';

export default function MoyRemontPage() {
  return (
    <Suspense>
      <CustomerDashboard />
    </Suspense>
  );
}
