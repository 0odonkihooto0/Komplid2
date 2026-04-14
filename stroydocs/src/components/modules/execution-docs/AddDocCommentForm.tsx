'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [urgency, setUrgency] = useState('');
  const [remarkType, setRemarkType] = useState('');
  const [plannedResolveDate, setPlannedResolveDate] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    createMutation.mutate(
      {
        text: text.trim(),
        ...(pageNumber && { pageNumber: parseInt(pageNumber, 10) }),
        ...(urgency && { urgency }),
        ...(remarkType && { remarkType }),
        ...(plannedResolveDate && {
          plannedResolveDate: new Date(plannedResolveDate).toISOString(),
        }),
        ...(suggestion.trim() && { suggestion: suggestion.trim() }),
      },
      {
        onSuccess: () => {
          setText('');
          setPageNumber('');
          setUrgency('');
          setRemarkType('');
          setPlannedResolveDate('');
          setSuggestion('');
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
        rows={3}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Срочность</Label>
          <Select value={urgency || 'NONE'} onValueChange={(v) => setUrgency(v === 'NONE' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Не указана" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Не указана</SelectItem>
              <SelectItem value="CRITICAL">Критическая</SelectItem>
              <SelectItem value="HIGH">Высокая</SelectItem>
              <SelectItem value="NORMAL">Обычная</SelectItem>
              <SelectItem value="LOW">Низкая</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Тип замечания</Label>
          <Select value={remarkType || 'NONE'} onValueChange={(v) => setRemarkType(v === 'NONE' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Не указан" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Не указан</SelectItem>
              <SelectItem value="DESIGN">Проектное</SelectItem>
              <SelectItem value="QUALITY">Качество</SelectItem>
              <SelectItem value="SAFETY">Безопасность</SelectItem>
              <SelectItem value="PROCESS">Процесс</SelectItem>
              <SelectItem value="OTHER">Прочее</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Страница PDF</Label>
          <Input
            type="number"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="№"
            min={1}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Плановая дата устранения</Label>
          <Input
            type="date"
            value={plannedResolveDate}
            onChange={(e) => setPlannedResolveDate(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Предложения по устранению</Label>
        <Textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="Рекомендации..."
          rows={2}
          className="text-xs"
        />
      </div>
      <Button type="submit" size="sm" disabled={!text.trim() || createMutation.isPending}>
        {createMutation.isPending ? 'Отправка...' : 'Добавить замечание'}
      </Button>
    </form>
  );
}
