import { ReactNode } from 'react';
import { ProfileTabs } from './ProfileTabs';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container max-w-3xl py-6">
      <h1 className="text-2xl font-bold mb-6">Профиль</h1>
      <ProfileTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
