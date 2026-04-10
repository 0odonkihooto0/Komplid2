'use client';

import { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Paperclip, X } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAddCorrespondence } from './useAddCorrespondence';

interface ObjectParticipant {
  organization: { id: string; name: string };
  roles: string[];
}

const formSchema = z.object({
  subject: z.string().min(3, 'Введите заголовок (мин. 3 символа)'),
  senderOrgId: z.string().uuid('Выберите организацию-отправителя'),
  receiverOrgId: z.string().uuid('Выберите организацию-получателя'),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

export function AddCorrespondenceDialog({ open, onOpenChange, objectId }: Props) {
  const { data: session } = useSession();
  const { createMutation, isPending } = useAddCorrespondence(objectId);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: participants = [] } = useQuery<ObjectParticipant[]>({
    queryKey: ['object-participants', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/participants`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const orgOptions = participants.map((p) => ({ id: p.organization.id, name: p.organization.name }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: '', senderOrgId: '', receiverOrgId: '' },
  });

  // Автозаполнение организации-отправителя из сессии текущего пользователя
  useEffect(() => {
    if (session?.user?.organizationId && !form.getValues('senderOrgId')) {
      form.setValue('senderOrgId', session.user.organizationId);
    }
  }, [session?.user?.organizationId, open, form]);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    editable: true,
  });

  const close = () => {
    form.reset();
    setFiles([]);
    editor?.commands.clearContent();
    onOpenChange(false);
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = form.handleSubmit((values) => {
    createMutation.mutate(
      { ...values, body: editor?.getHTML() ?? '', files },
      { onSuccess: close }
    );
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить письмо</DialogTitle>
          <DialogDescription className="sr-only">Форма создания нового письма</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Заголовок */}
          <div className="space-y-1.5">
            <Label>Заголовок письма</Label>
            <Input placeholder="Введите тему письма" {...form.register('subject')} />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Компания-отправитель */}
            <div className="space-y-1.5">
              <Label>Компания-отправитель</Label>
              <Select
                value={form.watch('senderOrgId')}
                onValueChange={(v) => form.setValue('senderOrgId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите организацию" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.senderOrgId && (
                <p className="text-xs text-destructive">{form.formState.errors.senderOrgId.message}</p>
              )}
            </div>

            {/* Получатель */}
            <div className="space-y-1.5">
              <Label>Получатель</Label>
              <Select
                value={form.watch('receiverOrgId')}
                onValueChange={(v) => form.setValue('receiverOrgId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите организацию" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.receiverOrgId && (
                <p className="text-xs text-destructive">{form.formState.errors.receiverOrgId.message}</p>
              )}
            </div>
          </div>

          {/* TipTap редактор */}
          <div className="space-y-1.5">
            <Label>Текст письма</Label>
            <div className="rounded-md border">
              <div className="flex items-center gap-1 border-b px-2 py-1.5">
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => editor?.chain().focus().toggleBold().run()} type="button"
                  aria-label="Жирный">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => editor?.chain().focus().toggleItalic().run()} type="button"
                  aria-label="Курсив">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()} type="button"
                  aria-label="Подчёркнутый">
                  <UnderlineIcon className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-5" />
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()} type="button"
                  aria-label="Маркированный список">
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()} type="button"
                  aria-label="Нумерованный список">
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
              </div>
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none min-h-[160px] p-3 [&_.ProseMirror]:outline-none"
              />
            </div>
          </div>

          {/* Загрузка файлов */}
          <div className="space-y-1.5">
            <Label>Вложения</Label>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[180px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="ml-1 text-muted-foreground hover:text-destructive" type="button" aria-label="Удалить файл">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" type="button"
                onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-3.5 w-3.5 mr-1" />
                Прикрепить файл
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isPending}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Отправка...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
