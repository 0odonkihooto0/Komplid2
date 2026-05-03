'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: address || undefined, description: description || undefined }),
      });
      const json = await res.json();

      if (!json.success) {
        // 402 — лимит проектов на бесплатном плане
        if (res.status === 402) {
          setError('Лимит проектов достигнут. Перейдите на Pro.');
        } else {
          setError(json.error ?? 'Ошибка при создании проекта');
        }
        return;
      }

      router.push(`/moy-remont/projects/${json.data.id}`);
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-6">Новый проект ремонта</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Название *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Ремонт квартиры на Садовой"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Адрес объекта</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ул. Садовая, д. 5, кв. 12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Капитальный ремонт трёхкомнатной квартиры..."
            rows={3}
          />
        </div>

        {error && (
          <div className="text-sm text-destructive">
            {error}{' '}
            {error.includes('Pro') && (
              <Link href="/moy-remont/upgrade" className="underline font-medium">
                Перейти на Pro
              </Link>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Создание...' : 'Создать проект'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
