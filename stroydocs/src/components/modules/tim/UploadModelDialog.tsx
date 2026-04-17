'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BimSection } from './useSections';
import { useUploadModel } from './useModels';

// Поддерживаемые CAD-системы для экспорта в IFC
const SOURCE_OPTIONS = [
  { value: 'nanoCAD BIM', label: 'nanoCAD BIM' },
  { value: 'Renga', label: 'Renga' },
  { value: 'Pilot-BIM', label: 'Pilot-BIM' },
  { value: 'Revit', label: 'Revit' },
  { value: 'ArchiCAD', label: 'ArchiCAD' },
  { value: 'Другое', label: 'Другое' },
] as const;

// Метки стадий
const STAGE_OPTIONS = [
  { value: 'OTR', label: 'ОТР' },
  { value: 'PROJECT', label: 'Проект' },
  { value: 'WORKING', label: 'РД' },
  { value: 'CONSTRUCTION', label: 'АС' },
] as const;

// Рекурсивно разворачиваем дерево разделов в плоский список с отступами
interface FlatSection { id: string; label: string }

function flattenSections(sections: BimSection[], depth = 0): FlatSection[] {
  return sections.flatMap((s) => [
    { id: s.id, label: '\u00A0'.repeat(depth * 3) + s.name },
    ...flattenSections(s.children, depth + 1),
  ]);
}

interface UploadModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sections: BimSection[];
  defaultSectionId?: string | null;
  /** Пред-заполнить поле «Наименование» (для загрузки новой версии существующей модели) */
  defaultName?: string;
}

export function UploadModelDialog({
  open, onOpenChange, projectId, sections, defaultSectionId, defaultName,
}: UploadModelDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [sectionId, setSectionId] = useState(defaultSectionId ?? '');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [comment, setComment] = useState('');

  // Синхронизация пред-заполненных значений при открытии диалога
  useEffect(() => {
    if (open) {
      if (defaultName !== undefined) setName(defaultName);
      if (defaultSectionId) setSectionId(defaultSectionId);
    }
  }, [open, defaultName, defaultSectionId]);

  const upload = useUploadModel(projectId);
  const flatSections = flattenSections(sections);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.ifc$/i, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim() || !sectionId) return;

    try {
      await upload.mutateAsync({
        file,
        name: name.trim(),
        comment: comment.trim() || null,
        sectionId,
        stage: (stage as 'OTR' | 'PROJECT' | 'WORKING' | 'CONSTRUCTION') || null,
        source: source || null,
      });

      // Сбрасываем форму при успехе
      setFile(null);
      setName('');
      setComment('');
      setStage('');
      setSource('');
      if (fileRef.current) fileRef.current.value = '';
      onOpenChange(false);
    } catch {
      // Ошибка обрабатывается через onError в useMutation (toast)
    }
  };

  const isValid = !!file && !!name.trim() && !!sectionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузить IFC-модель</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".ifc,.ifczip,.ifcxml"
              className="hidden" onChange={handleFileChange} />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Нажмите для выбора IFC-файла<br />
                <span className="text-xs">.ifc, .ifczip, .ifcxml</span>
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Поддерживаются модели из nanoCAD BIM, Renga, Pilot-BIM, Revit, ArchiCAD
          </p>

          {/* Наименование */}
          <div className="space-y-1">
            <Label htmlFor="model-name">Наименование *</Label>
            <Input id="model-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Конструктивная модель, корпус А" required />
          </div>

          {/* Раздел */}
          <div className="space-y-1">
            <Label>Раздел *</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите раздел" />
              </SelectTrigger>
              <SelectContent>
                {flatSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Стадия */}
          <div className="space-y-1">
            <Label>Стадия</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder="Не выбрана" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Источник модели */}
          <div className="space-y-1">
            <Label>Источник модели</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Комментарий */}
          <div className="space-y-1">
            <Label htmlFor="model-comment">Комментарий</Label>
            <Textarea id="model-comment" value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Версия 1.0, изменения..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline"
              onClick={() => onOpenChange(false)} disabled={upload.isPending}>
              Отмена
            </Button>
            <Button type="submit" disabled={!isValid || upload.isPending}>
              {upload.isPending ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
