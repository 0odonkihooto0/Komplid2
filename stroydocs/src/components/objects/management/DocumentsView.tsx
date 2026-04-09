'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderTree } from './FolderTree';
import { DocumentList } from './DocumentList';
import { useFolders, type ProjectFolder } from './useProjectDocuments';

interface DocumentsViewProps {
  objectId: string;
}

export function DocumentsView({ objectId }: DocumentsViewProps) {
  const { data: folders, isLoading } = useFolders(objectId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Автоматически выбрать первую папку при загрузке
  useEffect(() => {
    if (!selectedFolderId && folders && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  const selectedFolder = findFolder(folders ?? [], selectedFolderId);

  return (
    <div className="flex h-[calc(100vh-200px)] overflow-hidden">
      {/* Левая колонка: дерево папок */}
      <div className="flex w-64 shrink-0 flex-col border-r bg-background">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <FolderTree
            projectId={objectId}
            folders={folders ?? []}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
          />
        )}
      </div>

      {/* Правая колонка: содержимое папки */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {selectedFolder ? (
          <DocumentList
            projectId={objectId}
            folderId={selectedFolder.id}
            folderName={selectedFolder.name}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isLoading ? 'Загрузка...' : 'Выберите папку'}
          </div>
        )}
      </div>
    </div>
  );
}

/** Рекурсивный поиск папки по id */
function findFolder(
  folders: ProjectFolder[],
  id: string | null,
): ProjectFolder | undefined {
  if (!id) return undefined;
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children.length > 0) {
      const found = findFolder(folder.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
