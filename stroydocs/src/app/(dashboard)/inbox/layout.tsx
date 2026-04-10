import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Входящие — StroyDocs' };

export default function InboxLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
