import { Suspense } from 'react';
import { InviteForm } from './InviteForm';

export default function InvitePage() {
  return (
    <Suspense>
      <InviteForm />
    </Suspense>
  );
}
