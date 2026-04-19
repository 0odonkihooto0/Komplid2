import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

export interface ProjectFolder {
  id: string;
  name: string;
  order: number;
  pinTop: boolean;
  parentId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  children: ProjectFolder[];
  _count: { documents: number };
}

export interface ProjectDocumentUploader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isActual: boolean;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  qrToken: string | null;
  folderId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: ProjectDocumentUploader | null;
  versions?: ProjectDocumentVersion[];
}

export interface ProjectDocumentVersion {
  id: string;
  version: number;
  s3Key: string;
  fileName: string;
  fileSize: number;
  comment: string | null;
  uploadedById: string;
  documentId: string;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface QrInfo {
  token: string | null;
  verifyUrl: string;
  documentName: string;
}

// ─────────────────────────────────────────────
// Хуки запросов
// ─────────────────────────────────────────────

export function useFolders(projectId: string) {
  return useQuery<ProjectFolder[]>({
    queryKey: ['project-folders', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/folders`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки папок');
      return json.data as ProjectFolder[];
    },
    enabled: !!projectId,
  });
}

export function useDocuments(projectId: string, folderId: string | null) {
  return useQuery<ProjectDocument[]>({
    queryKey: ['project-documents', projectId, folderId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/project-documents?folderId=${folderId}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки документов');
      return json.data as ProjectDocument[];
    },
    enabled: !!projectId && !!folderId,
  });
}

export function useDocumentVersions(projectId: string, documentId: string | null) {
  return useQuery<ProjectDocumentVersion[]>({
    queryKey: ['project-document-versions', projectId, documentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/project-documents/${documentId}/versions`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки версий');
      return json.data as ProjectDocumentVersion[];
    },
    enabled: !!projectId && !!documentId,
  });
}

export function useQrInfo(projectId: string, documentId: string | null) {
  return useQuery<QrInfo>({
    queryKey: ['project-document-qr', projectId, documentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/project-documents/${documentId}/qr`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки QR');
      return json.data as QrInfo;
    },
    enabled: !!projectId && !!documentId,
  });
}

// ─────────────────────────────────────────────
// Хуки мутаций
// ─────────────────────────────────────────────

export function useFolderMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateFolders = () =>
    queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] });

  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания папки');
      return json.data as ProjectFolder;
    },
    onSuccess: () => {
      invalidateFolders();
      toast({ title: 'Папка создана' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      const res = await fetch(`/api/projects/${projectId}/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка переименования');
      return json.data as ProjectFolder;
    },
    onSuccess: () => invalidateFolders(),
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch(`/api/projects/${projectId}/folders/${folderId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления папки');
    },
    onSuccess: () => {
      invalidateFolders();
      toast({ title: 'Папка удалена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  return { createFolder, renameFolder, deleteFolder };
}

export function useDocumentMutations(projectId: string, folderId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateDocs = () => {
    queryClient.invalidateQueries({ queryKey: ['project-documents', projectId, folderId] });
    queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] });
  };

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      name,
      targetFolderId,
      description,
      onProgress,
    }: {
      file: File;
      name: string;
      targetFolderId: string;
      description?: string;
      onProgress?: (pct: number) => void;
    }) => {
      // Шаг 1: создать запись в БД и получить presigned URL
      const res = await fetch(`/api/projects/${projectId}/project-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          folderId: targetFolderId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          description,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания документа');

      const { presignedUrl } = json.data as { document: ProjectDocument; presignedUrl: string };

      // Шаг 2: загрузить файл напрямую в S3
      onProgress?.(10);
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Ошибка загрузки файла в хранилище');
      onProgress?.(100);

      return json.data.document as ProjectDocument;
    },
    onSuccess: () => {
      invalidateDocs();
      toast({ title: 'Файл загружен' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/project-documents/${documentId}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      invalidateDocs();
      toast({ title: 'Документ удалён' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const uploadNewVersion = useMutation({
    mutationFn: async ({
      documentId,
      file,
      comment,
    }: {
      documentId: string;
      file: File;
      comment?: string;
    }) => {
      // Шаг 1: создать новую версию и получить presigned URL
      const res = await fetch(
        `/api/projects/${projectId}/project-documents/${documentId}/versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            comment,
          }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания версии');

      const { presignedUrl } = json.data as { document: ProjectDocument; presignedUrl: string };

      // Шаг 2: загрузить новый файл в S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Ошибка загрузки файла в хранилище');

      return json.data.document as ProjectDocument;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['project-document-versions', projectId, vars.documentId],
      });
      invalidateDocs();
      toast({ title: 'Новая версия загружена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  return { uploadDocument, deleteDocument, uploadNewVersion };
}
