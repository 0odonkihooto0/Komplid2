import type { ReactNode } from 'react';
import { ObjectModuleSidebar } from '@/components/objects/ObjectModuleSidebar';

// Двухколоночный layout: модульная навигация слева + контент справа
export default async function ObjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  return (
    <div className="flex h-full">
      <ObjectModuleSidebar objectId={params.objectId} />
      {/* На мобильных добавляем отступ сверху под кнопку гамбургера */}
      <main className="flex-1 overflow-y-auto p-6 pt-14 md:pt-6">
        {children}
      </main>
    </div>
  );
}
