'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { OrganizationCard } from '@/components/modules/organizations/OrganizationCard';
import { EmployeeTable } from '@/components/modules/organizations/EmployeeTable';
import { InviteEmployeeDialog } from '@/components/modules/organizations/InviteEmployeeDialog';

export function OrganizationsContent() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Организация" />

      <Tabs defaultValue="card">
        <TabsList>
          <TabsTrigger value="card">Карточка компании</TabsTrigger>
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
        </TabsList>
        <TabsContent value="card" className="mt-4">
          <OrganizationCard />
        </TabsContent>
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Пригласить сотрудника
            </Button>
          </div>
          <EmployeeTable />
          <InviteEmployeeDialog open={inviteOpen} onOpenChange={setInviteOpen} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
