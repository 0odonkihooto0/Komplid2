'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDocComments } from './useDocComments';

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
}

export function AddDocCommentForm({ projectId, contractId, docId }: Props) {
  const { createMutation } = useDocComments(projectId, contractId, docId);
  const [text, setText] = useState('');
  const [pageNumber, setPageNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    createMutation.mutate(
      {
        text: text.trim(),
        ...(pageNumber && { pageNumber: parseInt(pageNumber, 10) }),
      },
      {
        onSuccess: () => {
          setText('');
          setPageNumber('');
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
      <Label className="text-sm font-medium">Добавить замечание</Label>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Текст замечания..."
        rows={2}
      />
      <div className="flex items-end gap-2">
        <div className="w-24 space-y-1">
          <Label className="text-xs">Страница</Label>
          <Input
            type="number"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="№"
            min={1}
          />
        </div>
        <Button type="submit" size="sm" disabled={!text.trim() || createMutation.isPending}>
          {createMutation.isPending ? 'Отправка...' : 'Отправить'}
        </Button>
      </div>
    </form>
  );
}
