'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CameraCapture } from '@/components/mobile/CameraCapture';
import { VoiceInput } from '@/components/mobile/VoiceInput';
import { useCreateJournalEntry } from '@/hooks/use-create-journal-entry';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function NewJournalEntryPage() {
  const { journalId } = useParams<{ journalId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const objectId = searchParams.get('objectId') ?? '';

  const [description, setDescription] = useState('');
  const [photoCount, setPhotoCount] = useState(0);

  const createMutation = useCreateJournalEntry();

  const handleSave = async () => {
    await createMutation.mutateAsync({
      journalId,
      projectId: objectId,
      date: new Date().toISOString(),
      description,
      data: {},
    });
    router.push(`/mobile/journal?objectId=${objectId}`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Новая запись</h1>
      </div>

      <div className="relative">
        <Textarea
          placeholder="Что сделали сегодня?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="pr-14 text-base"
        />
        <div className="absolute bottom-2 right-2">
          <VoiceInput onTranscript={(t) => setDescription((d) => (d ? d + ' ' + t : t))} />
        </div>
      </div>

      <CameraCapture
        entityType="JOURNAL_ENTRY"
        onCaptured={(_clientId) => setPhotoCount((n) => n + 1)}
      />

      {photoCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Прикреплено фото: {photoCount}
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={!description.trim() || createMutation.isPending}
        className="w-full h-12 text-base"
      >
        {createMutation.isPending ? 'Сохранение...' : 'Сохранить запись'}
      </Button>
    </div>
  );
}
