'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered, RotateCcw, Save, RefreshCw, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDocRichTextEditor } from './useDocRichTextEditor';
import type { ExecutionDocStatus } from '@prisma/client';

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
  docStatus: ExecutionDocStatus;
  onClose: () => void;
}

export function DocRichTextEditor({ projectId, contractId, docId, docStatus, onClose }: Props) {
  const { initialHtml, isLoading, saveMutation, resetMutation } = useDocRichTextEditor(
    projectId, contractId, docId
  );

  const isReadOnly = docStatus === 'SIGNED';

  const editor = useEditor({
    extensions: [StarterKit, Underline, Table, TableRow, TableCell, TableHeader],
    content: '',
    editable: !isReadOnly,
  });

  // Загрузить HTML в редактор после получения с сервера
  useEffect(() => {
    if (editor && initialHtml && !editor.getText()) {
      editor.commands.setContent(initialHtml);
    }
  }, [editor, initialHtml]);

  const handleSave = () => {
    if (!editor) return;
    saveMutation.mutate(editor.getHTML());
  };

  const handleReset = () => {
    resetMutation.mutate();
    onClose();
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-background p-4">
      {/* Тулбар */}
      <div className="flex flex-wrap items-center gap-1 border-b pb-2">
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={isReadOnly} title="Жирный">
          <Bold className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={isReadOnly} title="Курсив">
          <Italic className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={isReadOnly} title="Подчёркнутый">
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={isReadOnly} title="Маркированный список">
          <List className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={isReadOnly} title="Нумерованный список">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().undo().run()}
          disabled={isReadOnly} title="Отменить">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}
            disabled={resetMutation.isPending} title="Вернуть автогенерацию">
            <RefreshCw className="mr-1 h-3 w-3" />
            {resetMutation.isPending ? 'Сброс...' : 'Сбросить'}
          </Button>
          {!isReadOnly && (
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-1 h-3 w-3" />
              {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} title="Закрыть">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Область редактирования */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[400px] rounded-sm border p-3 focus-within:ring-1 focus-within:ring-ring [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
