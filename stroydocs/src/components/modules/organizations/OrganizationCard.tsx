'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import { useOrganizationCard } from './useOrganizationCard';
import { OrganizationEditDialog } from './OrganizationEditDialog';

export function OrganizationCard() {
  const { organization, isLoading } = useOrganizationCard();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-64" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!organization) return null;

  const fields = [
    { label: 'Название', value: organization.name },
    { label: 'ИНН', value: organization.inn },
    { label: 'ОГРН', value: organization.ogrn },
    { label: 'СРО', value: organization.sroName },
    { label: 'Номер СРО', value: organization.sroNumber },
    { label: 'Адрес', value: organization.address },
    { label: 'Телефон', value: organization.phone },
    { label: 'Email', value: organization.email },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Карточка компании</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="text-sm font-medium">{field.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <OrganizationEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organization={organization}
      />
    </>
  );
}
