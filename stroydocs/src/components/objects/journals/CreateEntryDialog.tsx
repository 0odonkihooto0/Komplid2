'use client';

import { useState } from 'react';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journalType: SpecialJournalType;
  isPending: boolean;
  onSubmit: (payload: CreateJournalEntryInput) => void;
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

  const resetForm = () => {
    setDate('');
    setDescription('');
    setLocation('');
    setWeather('');
    setTemperature('');
    setNormativeRef('');
    setInspectionDate('');
    setData({});
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

    onSubmit(payload);
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
