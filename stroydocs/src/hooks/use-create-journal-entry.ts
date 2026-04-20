'use client';

import { useOfflineMutation } from '@/hooks/use-offline-mutation';
import { journalEntriesRepo } from '@/lib/idb/repos/journal-entries-repo';

interface CreateJournalEntryVars {
  journalId: string;
  projectId: string;
  date: string;
  description: string;
  data: Record<string, unknown>;
  __clientId?: string;
}

export function useCreateJournalEntry() {
  return useOfflineMutation<{ data: { id: string } }, CreateJournalEntryVars>({
    url: (v) => `/api/projects/${v.projectId}/journals/${v.journalId}/entries`,
    method: 'POST',
    entityType: 'journal_entry',
    entityIdFromVars: (v) => v.__clientId,
    getDescription: (v) => `Запись в журнале «${v.description.slice(0, 40)}»`,

    optimisticUpdate: async (variables) => {
      const clientId = crypto.randomUUID();
      variables.__clientId = clientId;

      await journalEntriesRepo.create({
        clientId,
        journalId: variables.journalId,
        date: variables.date,
        description: variables.description,
        data: variables.data,
        syncStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachmentClientIds: [],
      });
    },

    onServerSuccess: async (data, variables) => {
      const clientId = variables.__clientId;
      const serverId = data?.data?.id;
      if (clientId && serverId) {
        await journalEntriesRepo.markSynced(clientId, serverId);
      }
    },
  });
}
