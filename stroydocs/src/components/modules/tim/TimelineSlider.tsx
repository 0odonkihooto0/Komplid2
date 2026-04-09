'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  minDate: Date;
  maxDate: Date;
  value: Date;
  onChange: (date: Date) => void;
}

export function TimelineSlider({ minDate, maxDate, value, onChange }: Props) {
  const minMs = minDate.getTime();
  const maxMs = maxDate.getTime();
  const valMs = value.getTime();

  const percent = maxMs > minMs
    ? Math.round(((valMs - minMs) / (maxMs - minMs)) * 100)
    : 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const ms = Number(e.target.value);
    onChange(new Date(ms));
  }

  return (
    <div className="border-t bg-background px-4 py-2">
      {/* Даты-метки */}
      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{format(minDate, 'dd.MM.yy', { locale: ru })}</span>
        <span className="font-medium text-foreground">
          {format(value, 'd MMMM yyyy', { locale: ru })} · {percent}%
        </span>
        <span>{format(maxDate, 'dd.MM.yy', { locale: ru })}</span>
      </div>

      {/* Слайдер */}
      <input
        type="range"
        min={minMs}
        max={maxMs}
        step={86_400_000} // шаг — 1 день
        value={valMs}
        onChange={handleChange}
        className="w-full cursor-pointer accent-primary"
        aria-label="Временная шкала ГПР"
      />

      {/* Легенда цветов */}
      <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#9CA3AF]" /> Без привязки
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E]" /> Подписан (АОСР)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#EAB308]" /> На согласовании
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#EF4444]" /> Не завершены по ГПР
        </span>
      </div>
    </div>
  );
}
