'use client';

import { JournalCard } from '@/components/objects/journals/JournalCard';

export default function JournalDetailPage({
  params,
}: {
  params: { objectId: string; journalId: string };
}) {
  return <JournalCard objectId={params.objectId} journalId={params.journalId} />;
}
