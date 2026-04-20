'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useDropzone } from 'react-dropzone';
import { z } from 'zod';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Upload, X, FileText } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TagInput } from '@/components/shared/TagInput';
import { useCreateSEDDocument } from './useCreateSEDDocument';

const DOC_TYPE_OPTIONS = [
  { value: 'LETTER', label: 'Письмо' },
  { value: 'ORDER', label: 'Приказ' },
  { value: 'PROTOCOL', label: 'Протокол' },
  { value: 'ACT', label: 'Акт' },
  { value: 'MEMO', label: 'Докладная' },
  { value: 'NOTIFICATION', label: 'Уведомление' },
  { value: 'OTHER', label: 'Иное' },
] as const;

const formSchema = z.object({
  docType: z.enum(['LETTER', 'ORDER', 'PROTOCOL', 'ACT', 'MEMO', 'NOTIFICATION', 'OTHER']),
  title: z.string().min(3, 'Введите заголовок (мин. 3 символа)').max(500),
  number: z.string().min(1, 'Номер обязателен').max(100),
  date: z.string().min(1, 'Укажите дату'),
  senderUserId: z.string().uuid('Выберите отправителя'),
  senderOrgId: z.string().uuid(),
  // Получатель физлицо — опционально
  receiverUserId: z.string().uuid().optional().or(z.literal('')),
  // Получатель организация — обязательна для заполнения receiverOrgIds в API
  receiverOrgId: z.string().uuid('Выберите организацию-получателя'),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

export function CreateSEDDocumentDialog({ open, onOpenChange, objectId }: Props) {
  const { data: session } = useSession();
  const [tags, setTags] = useState<string[]>([]);

  // Все хуки — до любых условных return (CLAUDE.md: react-hooks/rules-of-hooks)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      docType: 'LETTER',
      title: '',
      number: '',
      date: new Date().toISOString().slice(0, 10),
      senderUserId: '',
      senderOrgId: '',
      receiverUserId: '',
      receiverOrgId: '',
    },
  });

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    editable: true,
  });

  const close = () => {
    form.reset();
    setTags([]);
    editor?.commands.clearContent();
    onOpenChange(false);
  };

  const { employees, participants, nextNumber, stagedFiles, addFile, removeFile, createMutation } =
    useCreateSEDDocument({ objectId, open, onSuccess: close });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFile,
    multiple: true,
  });

  // Автозаполнение организации-отправителя из сессии текущего пользователя
  useEffect(() => {
    if (session?.user?.organizationId && !form.getValues('senderOrgId')) {
      form.setValue('senderOrgId', session.user.organizationId);
    }
  }, [session?.user?.organizationId, open, form]);

  // Предзаполнение номера после загрузки с сервера
  useEffect(() => {
    if (nextNumber && !form.getValues('number')) {
      form.setValue('number', nextNumber);
    }
  }, [nextNumber, form]);

  const senderOrgName =
    participants.find((p) => p.organization?.id === session?.user?.organizationId)?.organization?.name ?? '';

  const formatFileSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} КБ`
      : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;

  const employeeLabel = (emp: (typeof employees)[0]) =>
    [emp.lastName, emp.firstName, emp.middleName].filter(Boolean).join(' ') || emp.email;

  const handleSubmit = (activate: boolean) => {
    form.handleSubmit((values) => {
      createMutation.mutate({
        payload: {
          docType: values.docType,
          title: values.title,
          number: values.number,
          date: values.date,
          body: editor?.getHTML() ?? '',
          senderOrgId: values.senderOrgId,
          // receiverOrgIds обязателен в API (min 1)
          receiverOrgIds: [values.receiverOrgId],
          senderUserId: values.senderUserId || undefined,
          receiverUserId: values.receiverUserId || undefined,
          receiverOrgId: values.receiverOrgId,
          tags,
        },
        activate,
      });
    })();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новый документ СЭД</DialogTitle>
          <DialogDescription className="sr-only">
            Форма создания документа системы электронного документооборота
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* ── Левая колонка: реквизиты ── */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Тип документа *</Label>
                <Select
                  value={form.watch('docType')}
                  onValueChange={(v) => form.setValue('docType', v as FormValues['docType'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Номер</Label>
                <Input {...form.register('number')} />
                {form.formState.errors.number && (
                  <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Дата *</Label>
              <Input type="date" {...form.register('date')} />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Заголовок *</Label>
              <Input placeholder="Введите заголовок документа" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Отправитель *</Label>
              <Select
                value={form.watch('senderUserId')}
                onValueChange={(v) => form.setValue('senderUserId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {employeeLabel(emp)}{emp.position ? ` — ${emp.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.senderUserId && (
                <p className="text-xs text-destructive">{form.formState.errors.senderUserId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Организация-отправитель</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm text-muted-foreground truncate">
                {senderOrgName || '—'}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Получатель (физлицо)</Label>
              <Select
                value={form.watch('receiverUserId')}
                onValueChange={(v) => form.setValue('receiverUserId', v)}
              >
                <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {employeeLabel(emp)}{emp.position ? ` — ${emp.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Организация-получатель *</Label>
              <Select
                value={form.watch('receiverOrgId')}
                onValueChange={(v) => form.setValue('receiverOrgId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Выберите организацию" /></SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.organization.id} value={p.organization.id}>
                      {p.organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.receiverOrgId && (
                <p className="text-xs text-destructive">{form.formState.errors.receiverOrgId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Тэги</Label>
              <TagInput value={tags} onChange={setTags} placeholder="Введите тэг и нажмите Enter" />
            </div>
          </div>

          {/* ── Правая колонка: содержание и вложения ── */}
          <div className="flex flex-col space-y-4">
            <div className="space-y-1.5 flex-1">
              <Label>Текст документа</Label>
              {/* Тулбар TipTap */}
              <div className="flex flex-wrap items-center gap-1 border-b pb-2">
                <Button size="icon" variant="ghost" type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()} title="Жирный">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()} title="Курсив">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" type="button"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Подчёркнутый">
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button size="icon" variant="ghost" type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Маркированный список">
                  <List className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерованный список">
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none min-h-[280px] rounded-sm border p-3 focus-within:ring-1 focus-within:ring-ring [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[260px]"
              />
            </div>

            {/* Dropzone для вложений */}
            <div className="space-y-2">
              <Label>Прикреплённые файлы</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  {isDragActive ? 'Отпустите файлы...' : 'Перетащите файлы или нажмите для выбора'}
                </p>
              </div>
              {stagedFiles.length > 0 && (
                <ul className="space-y-1">
                  {stagedFiles.map((file, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {formatFileSize(file.size)}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label="Удалить файл"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={close}>Отмена</Button>
          <Button
            variant="outline"
            disabled={createMutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            Сохранить черновик
          </Button>
          <Button disabled={createMutation.isPending} onClick={() => handleSubmit(true)}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
