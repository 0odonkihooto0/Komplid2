'use client';

import { useState } from 'react';

// Маппинг субъектов РФ → федеральный округ
const REGION_TO_DISTRICT: Record<string, string> = {
  // Центральный
  'Белгородская область': 'Центральный', 'Брянская область': 'Центральный',
  'Владимирская область': 'Центральный', 'Воронежская область': 'Центральный',
  'Ивановская область': 'Центральный', 'Калужская область': 'Центральный',
  'Костромская область': 'Центральный', 'Курская область': 'Центральный',
  'Липецкая область': 'Центральный', 'Москва': 'Центральный',
  'Московская область': 'Центральный', 'Орловская область': 'Центральный',
  'Рязанская область': 'Центральный', 'Смоленская область': 'Центральный',
  'Тамбовская область': 'Центральный', 'Тверская область': 'Центральный',
  'Тульская область': 'Центральный', 'Ярославская область': 'Центральный',
  // Северо-Западный
  'Республика Карелия': 'Северо-Западный', 'Республика Коми': 'Северо-Западный',
  'Архангельская область': 'Северо-Западный', 'Вологодская область': 'Северо-Западный',
  'Калининградская область': 'Северо-Западный', 'Ленинградская область': 'Северо-Западный',
  'Мурманская область': 'Северо-Западный', 'Новгородская область': 'Северо-Западный',
  'Псковская область': 'Северо-Западный', 'Санкт-Петербург': 'Северо-Западный',
  'Ненецкий автономный округ': 'Северо-Западный',
  // Южный
  'Республика Адыгея': 'Южный', 'Республика Калмыкия': 'Южный',
  'Республика Крым': 'Южный', 'Краснодарский край': 'Южный',
  'Астраханская область': 'Южный', 'Волгоградская область': 'Южный',
  'Ростовская область': 'Южный', 'Севастополь': 'Южный',
  // Северо-Кавказский
  'Республика Дагестан': 'Северо-Кавказский', 'Республика Ингушетия': 'Северо-Кавказский',
  'Кабардино-Балкарская Республика': 'Северо-Кавказский',
  'Карачаево-Черкесская Республика': 'Северо-Кавказский',
  'Республика Северная Осетия — Алания': 'Северо-Кавказский',
  'Чеченская Республика': 'Северо-Кавказский', 'Ставропольский край': 'Северо-Кавказский',
  // Приволжский
  'Республика Башкортостан': 'Приволжский', 'Республика Марий Эл': 'Приволжский',
  'Республика Мордовия': 'Приволжский', 'Республика Татарстан': 'Приволжский',
  'Удмуртская Республика': 'Приволжский', 'Чувашская Республика': 'Приволжский',
  'Пермский край': 'Приволжский', 'Кировская область': 'Приволжский',
  'Нижегородская область': 'Приволжский', 'Оренбургская область': 'Приволжский',
  'Пензенская область': 'Приволжский', 'Самарская область': 'Приволжский',
  'Саратовская область': 'Приволжский', 'Ульяновская область': 'Приволжский',
  // Уральский
  'Курганская область': 'Уральский', 'Свердловская область': 'Уральский',
  'Тюменская область': 'Уральский', 'Челябинская область': 'Уральский',
  'Ханты-Мансийский автономный округ — Югра': 'Уральский',
  'Ямало-Ненецкий автономный округ': 'Уральский',
  // Сибирский
  'Республика Алтай': 'Сибирский', 'Республика Тыва': 'Сибирский',
  'Республика Хакасия': 'Сибирский', 'Алтайский край': 'Сибирский',
  'Красноярский край': 'Сибирский', 'Иркутская область': 'Сибирский',
  'Кемеровская область': 'Сибирский', 'Новосибирская область': 'Сибирский',
  'Омская область': 'Сибирский', 'Томская область': 'Сибирский',
  // Дальневосточный
  'Республика Бурятия': 'Дальневосточный', 'Республика Саха (Якутия)': 'Дальневосточный',
  'Забайкальский край': 'Дальневосточный', 'Камчатский край': 'Дальневосточный',
  'Приморский край': 'Дальневосточный', 'Хабаровский край': 'Дальневосточный',
  'Амурская область': 'Дальневосточный', 'Магаданская область': 'Дальневосточный',
  'Сахалинская область': 'Дальневосточный', 'Еврейская автономная область': 'Дальневосточный',
  'Чукотский автономный округ': 'Дальневосточный',
};

// Описание федеральных округов: позиция (x,y,w,h) и метка для SVG viewBox 900×380
const DISTRICTS = [
  { id: 'nw',  name: 'Северо-Западный',  x: 10,  y: 20,  w: 140, h: 140, short: 'С-З' },
  { id: 'c',   name: 'Центральный',       x: 110, y: 145, w: 160, h: 115, short: 'Цент.' },
  { id: 's',   name: 'Южный',             x: 110, y: 245, w: 145, h: 90,  short: 'Юж.' },
  { id: 'sk',  name: 'Северо-Кавказский', x: 145, y: 322, w: 120, h: 58,  short: 'С-Кав.' },
  { id: 'v',   name: 'Приволжский',       x: 265, y: 165, w: 140, h: 200, short: 'Привол.' },
  { id: 'u',   name: 'Уральский',         x: 395, y: 110, w: 130, h: 210, short: 'Урал.' },
  { id: 'sib', name: 'Сибирский',         x: 515, y: 65,  w: 215, h: 265, short: 'Сиб.' },
  { id: 'dv',  name: 'Дальневосточный',   x: 725, y: 20,  w: 165, h: 360, short: 'Д-Вост.' },
] as const;

interface ObjectItem {
  region: string | null;
}

interface MapWidgetSchemaProps {
  objects: ObjectItem[];
}

export function MapWidgetSchema({ objects }: MapWidgetSchemaProps) {
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  // Подсчёт объектов по округам
  const districtCounts = objects.reduce<Record<string, number>>((acc, obj) => {
    if (!obj.region) return acc;
    const district = REGION_TO_DISTRICT[obj.region];
    if (district) acc[district] = (acc[district] ?? 0) + 1;
    return acc;
  }, {});

  const maxCount = Math.max(1, ...Object.values(districtCounts));

  const getFill = (name: string) => {
    const count = districtCounts[name] ?? 0;
    if (count === 0) return '#e5e7eb';
    const intensity = 0.3 + (count / maxCount) * 0.55;
    return `hsl(221, 83%, ${Math.round((1 - intensity) * 60 + 35)}%)`;
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 900 390"
        className="w-full h-auto max-h-[280px]"
        style={{ userSelect: 'none' }}
      >
        {/* Фон */}
        <rect width="900" height="390" fill="#f8fafc" rx="8" />

        {DISTRICTS.map((d) => {
          const count = districtCounts[d.name] ?? 0;
          return (
            <g
              key={d.id}
              onMouseEnter={(e) => {
                const svg = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const rect = (e.currentTarget.firstChild as SVGRectElement).getBoundingClientRect();
                setTooltip({
                  name: d.name,
                  count,
                  x: rect.left + rect.width / 2 - svg.left,
                  y: rect.top - svg.top - 8,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'default' }}
            >
              <rect
                x={d.x} y={d.y} width={d.w} height={d.h}
                fill={getFill(d.name)}
                rx="6"
                stroke="white" strokeWidth="2"
              />
              {/* Короткое название */}
              <text
                x={d.x + d.w / 2} y={d.y + d.h / 2 - (count > 0 ? 8 : 0)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fill={count > 0 ? 'white' : '#6b7280'} fontWeight="600"
              >
                {d.short}
              </text>
              {/* Счётчик объектов */}
              {count > 0 && (
                <text
                  x={d.x + d.w / 2} y={d.y + d.h / 2 + 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="14" fill="white" fontWeight="700"
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Всплывающий tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-md border bg-popover px-3 py-1.5 shadow-md"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <p className="text-xs font-semibold">{tooltip.name}</p>
          <p className="text-xs text-muted-foreground">
            {tooltip.count > 0 ? `${tooltip.count} объект(ов)` : 'Нет объектов'}
          </p>
        </div>
      )}

      {/* Легенда */}
      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-5 rounded bg-gray-200 inline-block" />Нет объектов
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-5 rounded bg-blue-500 inline-block" />Есть объекты
        </span>
      </div>
    </div>
  );
}
