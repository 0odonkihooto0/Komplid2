import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Тип категории ИД (с дочерними и счётчиками)
export interface IdDocCategoryItem {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isTemplate: boolean;
  children: IdDocCategoryItem[];
  _count: {
    executionDocs: number;
    ks2Acts: number;
    children: number;
  };
}

// Хук управления категориями ИД проекта
export function useIdCategories(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['id-categories', projectId];

  const { data, isLoading } = useQuery<IdDocCategoryItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/id-categories`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки категорий');
      return json.data;
    },
    enabled: !!projectId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // Создать категорию
  const createCategory = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/id-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания категории');
      return json.data;
    },
    onSuccess: invalidate,
  });

  // Переименовать категорию
  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const res = await fetch(`/api/projects/${projectId}/id-categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка переименования');
      return json.data;
    },
    onSuccess: invalidate,
  });

  // Удалить категорию
  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`/api/projects/${projectId}/id-categories/${categoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления категории');
      return json.data;
    },
    onSuccess: invalidate,
  });

  // Импортировать шаблонные категории организации
  const importFromTemplates = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/id-categories/from-templates`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка импорта шаблонов');
      return json.data as { imported: number; message?: string };
    },
    onSuccess: invalidate,
  });

  return {
    categories: data ?? [],
    isLoading,
    createCategory,
    renameCategory,
    deleteCategory,
    importFromTemplates,
  };
}
