'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Sentinel-значение для пункта "Все таблицы" — Radix UI запрещает value="" */
const ALL_TABLES = '__all__';

/** Полный перечень классификационных таблиц КСИ согласно Постановлениям Правительства */
export const KSI_TABLES = [
  { code: '', label: 'Все таблицы' },
  { code: 'ПЗо / RZo', label: 'ПЗо — Зона; Помещение' },
  { code: 'КОС / CCo', label: 'КОС — Комплекс ОКС' },
  { code: 'ОКС / CEn', label: 'ОКС — Объект капстроительства' },
  { code: 'ФнС / FnS', label: 'ФнС — Функциональная система' },
  { code: 'ТхС / TeS', label: 'ТхС — Техническая система' },
  { code: 'Ком / Com', label: 'Ком — Компонент' },
  { code: 'УПр / Mng', label: 'УПр — Управление' },
  { code: 'СЖЦ / LCS', label: 'СЖЦ — Стадия жизненного цикла' },
  { code: 'ПИИ / PER', label: 'ПИИ — Процесс инженерных изысканий' },
  { code: 'ППр / PDe', label: 'ППр — Процесс проектирования' },
  { code: 'ПСт / PCo', label: 'ПСт — Процесс строительства' },
  { code: 'ПЭк / PMn', label: 'ПЭк — Процесс эксплуатации' },
  { code: 'ПРк / PRe', label: 'ПРк — Процесс реконструкции' },
  { code: 'ПКР / PRf', label: 'ПКР — Процесс ремонта' },
  { code: 'ПСЗ / PUt', label: 'ПСЗ — Процесс сноса' },
  { code: 'СтИ / CPr', label: 'СтИ — Строительное изделие' },
  { code: 'СтМ / CMa', label: 'СтМ — Строительный материал' },
  { code: 'ВсР / ARe', label: 'ВсР — Вспомогательный ресурс' },
  { code: 'ТрР / Hre', label: 'ТрР — Трудовой ресурс' },
  { code: 'Инф / Inf', label: 'Инф — Информация' },
  { code: 'Хрк / Prp', label: 'Хрк — Характеристика' },
] as const;

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Выпадающий список для выбора классификационной таблицы КСИ */
export function KsiTableSelector({ value, onChange }: Props) {
  return (
    <Select
      value={value === '' ? ALL_TABLES : value}
      onValueChange={(v) => onChange(v === ALL_TABLES ? '' : v)}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Классификационная таблица" />
      </SelectTrigger>
      <SelectContent>
        {KSI_TABLES.map((t) => (
          <SelectItem key={t.code || ALL_TABLES} value={t.code || ALL_TABLES} className="text-xs">
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
