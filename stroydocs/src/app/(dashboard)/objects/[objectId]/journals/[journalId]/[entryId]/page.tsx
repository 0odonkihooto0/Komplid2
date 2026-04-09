'use client';

import { EntryDetailCard } from '@/components/objects/journals/EntryDetailCard';

export const dynamic = 'force-dynamic';

export default function JournalEntryPage({
  params,
}: {
  params: { objectId: string; journalId: string; entryId: string };
}) {
  return (
    <EntryDetailCard
      objectId={params.objectId}
      journalId={params.journalId}
      entryId={params.entryId}
    />
  );
}
