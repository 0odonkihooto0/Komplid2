'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateOrganizationSchema, type UpdateOrganizationInput } from '@/lib/validations/organization';
import { useOrganizationCard } from './useOrganizationCard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: {
    name: string;
    inn: string;
    ogrn: string | null;
    sroName: string | null;
    sroNumber: string | null;
    sroInn: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
}

export function OrganizationEditDialog({ open, onOpenChange, organization }: Props) {
  const { updateMutation } = useOrganizationCard();
  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      inn: organization.inn,
      ogrn: organization.ogrn,
      sroName: organization.sroName,
      sroNumber: organization.sroNumber,
      sroInn: organization.sroInn,
      address: organization.address,
      phone: organization.phone,
      email: organization.email,
    },
  });

  const onSubmit = (data: UpdateOrganizationInput) => {
    updateMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
  };

  const fields = [
    { name: 'name' as const, label: 'Название' },
    { name: 'inn' as const, label: 'ИНН' },
    { name: 'ogrn' as const, label: 'ОГРН' },
    { name: 'sroName' as const, label: 'Название СРО' },
    { name: 'sroNumber' as const, label: 'Номер СРО' },
    { name: 'address' as const, label: 'Адрес' },
    { name: 'phone' as const, label: 'Телефон' },
    { name: 'email' as const, label: 'Email' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактирование организации</DialogTitle>
          <DialogDescription className="sr-only">Отредактируйте реквизиты и данные организации</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input id={field.name} {...form.register(field.name)} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
