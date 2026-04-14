'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SpecialJournalType } from '@prisma/client';
import type { CreateJournalEntryInput } from '@/lib/validations/journal-schemas';
import { ConcreteWorksFields } from './fields/ConcreteWorksFields';
import { WeldingWorksFields } from './fields/WeldingWorksFields';
import { SupervisionFields } from './fields/SupervisionFields';
import { MountingWorksFields } from './fields/MountingWorksFields';
import { AnticorrosionFields } from './fields/AnticorrosionFields';
import { GeodeticFields } from './fields/GeodeticFields';
import { EarthworksFields } from './fields/EarthworksFields';
import { PileDrivingFields } from './fields/PileDrivingFields';
import { CableLayingFields } from './fields/CableLayingFields';
import { FireSafetyFields } from './fields/FireSafetyFields';
import { DrillingWorksFields } from './fields/DrillingWorksFields';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journalType: SpecialJournalType;
  isPending: boolean;
  onSubmit: (payload: CreateJournalEntryInput, files: File[]) => void;
}

export function CreateEntryDialog({
  open,
  onOpenChange,
  journalType,
  isPending,
  onSubmit,
}: Props) {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [normativeRef, setNormativeRef] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted: File[]) => {
      setStagedFiles((prev) => [...prev, ...accepted]);
    },
    maxSize: 20 * 1024 * 1024, // 20 МБ
  });

  const resetForm = () => {
    setDate('');
    setDescription('');
    setLocation('');
    setWeather('');
    setTemperature('');
    setNormativeRef('');
    setInspectionDate('');
    setData({});
    setStagedFiles([]);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description.trim()) return;

    const payload: CreateJournalEntryInput = {
      date,
      description: description.trim(),
      location: location.trim() || undefined,
      weather: weather.trim() || undefined,
      temperature: temperature ? Number(temperature) : undefined,
      normativeRef: normativeRef.trim() || undefined,
      inspectionDate: inspectionDate || undefined,
      data: Object.keys(data).length > 0 ? data : undefined,
    };

    onSubmit(payload, stagedFiles);
  };

  const removeFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, j) => j !== index));
  };

  // Динамические поля по типу журнала
  const renderTypeFields = () => {
    switch (journalType) {
      case 'CONCRETE_WORKS':
        return <ConcreteWorksFields data={data} onChange={setData} />;
      case 'WELDING_WORKS':
        return <WeldingWorksFields data={data} onChange={setData} />;
      case 'AUTHOR_SUPERVISION':
        return <SupervisionFields data={data} onChange={setData} />;
      case 'MOUNTING_WORKS':
        return <MountingWorksFields data={data} onChange={setData} />;
      case 'ANTICORROSION':
        return <AnticorrosionFields data={data} onChange={setData} />;
      case 'GEODETIC':
        return <GeodeticFields data={data} onChange={setData} />;
      case 'EARTHWORKS':
        return <EarthworksFields data={data} onChange={setData} />;
      case 'PILE_DRIVING':
        return <PileDrivingFields data={data} onChange={setData} />;
      case 'CABLE_LAYING':
        return <CableLayingFields data={data} onChange={setData} />;
      case 'FIRE_SAFETY':
        return <FireSafetyFields data={data} onChange={setData} />;
      case 'DRILLING_WORKS':
        return <DrillingWorksFields data={data} onChange={setData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая запись</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основные поля */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Место (ось, этаж)</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Секция 1, эт. 3"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Описание работ *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Опишите выполненные работы..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Погода</Label>
              <Input
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="Ясно, без осадков"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Температура (°C)</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Нормативная ссылка</Label>
              <Input
                value={normativeRef}
                onChange={(e) => setNormativeRef(e.target.value)}
                placeholder="СП, ГОСТ, проект"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Дата освидетельствования</Label>
              <Input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Специфичные поля по типу журнала */}
          {renderTypeFields()}

          {/* Вложения */}
          <div className="space-y-1.5">
            <Label>Вложения</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-3 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {isDragActive ? 'Отпустите файлы...' : 'Перетащите файлы или нажмите (до 20 МБ)'}
              </p>
            </div>
            {stagedFiles.length > 0 && (
              <ul className="space-y-1 mt-2">
                {stagedFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                    <span className="truncate max-w-[240px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-2 text-gray-400 hover:text-gray-700"
                      aria-label={`Удалить файл ${f.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!date || !description.trim() || isPending}
            >
              {isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
