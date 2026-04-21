/**
 * Seed: 50 шаблонов АОСР по категориям работ для ИД-Мастер (Фаза 6 Модуль 15).
 * Шаблоны системные (organizationId = null) — доступны всем пользователям с подпиской.
 */

import type { PrismaClient } from '@prisma/client';

interface AosrTemplateSeed {
  id: string;
  name: string;
  workType: string;
  description: string;
}

const AOSR_TEMPLATES: AosrTemplateSeed[] = [
  // ─── ЗЕМЛЯНЫЕ (10) ───
  {
    id: 'aosr-tmpl-01',
    name: 'АОСР — Разработка котлована экскаватором',
    workType: 'земляные',
    description: 'ГЭСН 01-01-003. Разработка грунта в котлованах экскаваторами. Плейсхолдеры: {object}, {number}, {date}, {volume}, {unit}, {snip}.',
  },
  {
    id: 'aosr-tmpl-02',
    name: 'АОСР — Устройство обратной засыпки',
    workType: 'земляные',
    description: 'ГЭСН 01-02-005. Засыпка траншей и котлованов. Плейсхолдеры: {object}, {number}, {date}, {volume}, {unit}.',
  },
  {
    id: 'aosr-tmpl-03',
    name: 'АОСР — Планировка строительной площадки',
    workType: 'земляные',
    description: 'ГЭСН 01-01-001. Планировка площадей бульдозерами. Плейсхолдеры: {object}, {number}, {date}, {volume}.',
  },
  {
    id: 'aosr-tmpl-04',
    name: 'АОСР — Устройство дренажа',
    workType: 'земляные',
    description: 'СП 104.13330.2016. Дренажные системы. Плейсхолдеры: {object}, {number}, {date}, {depth}, {length}, {material}.',
  },
  {
    id: 'aosr-tmpl-05',
    name: 'АОСР — Разработка траншей под коммуникации',
    workType: 'земляные',
    description: 'ГЭСН 01-02-001. Разработка траншей механизированным способом. Плейсхолдеры: {object}, {number}, {date}, {length}, {depth}.',
  },
  {
    id: 'aosr-tmpl-06',
    name: 'АОСР — Уплотнение грунта',
    workType: 'земляные',
    description: 'ГЭСН 01-02-057. Уплотнение грунта катками. Плейсхолдеры: {object}, {number}, {date}, {area}, {layers}.',
  },
  {
    id: 'aosr-tmpl-07',
    name: 'АОСР — Устройство щебёночного основания под фундамент',
    workType: 'земляные',
    description: 'СП 22.13330.2016. Щебёночная подготовка. Плейсхолдеры: {object}, {number}, {date}, {thickness}, {area}.',
  },
  {
    id: 'aosr-tmpl-08',
    name: 'АОСР — Вертикальная планировка территории',
    workType: 'земляные',
    description: 'ГЭСН 01-01-013. Срезка растительного слоя. Плейсхолдеры: {object}, {number}, {date}, {area}, {depth}.',
  },
  {
    id: 'aosr-tmpl-09',
    name: 'АОСР — Укладка геотекстиля',
    workType: 'земляные',
    description: 'ТУ на геотекстиль. Укладка нетканого полотна. Плейсхолдеры: {object}, {number}, {date}, {area}, {brand}.',
  },
  {
    id: 'aosr-tmpl-10',
    name: 'АОСР — Устройство свайного поля',
    workType: 'земляные',
    description: 'ГЭСН 05-01-001. Погружение забивных свай. Плейсхолдеры: {object}, {number}, {date}, {count}, {length}, {section}.',
  },

  // ─── БЕТОННЫЕ (10) ───
  {
    id: 'aosr-tmpl-11',
    name: 'АОСР — Устройство бетонной подготовки',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-001. Бетонная подготовка под полы и фундаменты. Плейсхолдеры: {object}, {number}, {date}, {thickness}, {area}, {class}.',
  },
  {
    id: 'aosr-tmpl-12',
    name: 'АОСР — Устройство монолитных фундаментов',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-024. Монолитные ленточные фундаменты. Плейсхолдеры: {object}, {number}, {date}, {volume}, {class}, {snip}.',
  },
  {
    id: 'aosr-tmpl-13',
    name: 'АОСР — Устройство монолитных колонн',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-031. Бетонирование колонн. Плейсхолдеры: {object}, {number}, {date}, {count}, {height}, {section}, {class}.',
  },
  {
    id: 'aosr-tmpl-14',
    name: 'АОСР — Устройство монолитных перекрытий',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-036. Монолитные перекрытия. Плейсхолдеры: {object}, {number}, {date}, {volume}, {thickness}, {class}.',
  },
  {
    id: 'aosr-tmpl-15',
    name: 'АОСР — Устройство монолитных стен',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-028. Монолитные стены. Плейсхолдеры: {object}, {number}, {date}, {volume}, {thickness}, {class}.',
  },
  {
    id: 'aosr-tmpl-16',
    name: 'АОСР — Армирование конструкций',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-001. Вязка арматурных каркасов. Плейсхолдеры: {object}, {number}, {date}, {weight}, {class_rebar}.',
  },
  {
    id: 'aosr-tmpl-17',
    name: 'АОСР — Устройство монолитных лестничных маршей',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-047. Монолитные лестницы. Плейсхолдеры: {object}, {number}, {date}, {volume}, {class}.',
  },
  {
    id: 'aosr-tmpl-18',
    name: 'АОСР — Устройство монолитных балок и ригелей',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-033. Монолитные балки. Плейсхолдеры: {object}, {number}, {date}, {volume}, {class}.',
  },
  {
    id: 'aosr-tmpl-19',
    name: 'АОСР — Гидроизоляция фундаментов',
    workType: 'бетонные',
    description: 'СП 28.13330.2017. Гидроизоляция подземных конструкций. Плейсхолдеры: {object}, {number}, {date}, {area}, {material}, {layers}.',
  },
  {
    id: 'aosr-tmpl-20',
    name: 'АОСР — Устройство монолитных резервуаров и приямков',
    workType: 'бетонные',
    description: 'ГЭСН 06-01-061. Монолитные ёмкостные конструкции. Плейсхолдеры: {object}, {number}, {date}, {volume}, {class}.',
  },

  // ─── МОНТАЖНЫЕ (10) ───
  {
    id: 'aosr-tmpl-21',
    name: 'АОСР — Монтаж металлических колонн',
    workType: 'монтажные',
    description: 'ГЭСН 09-01-001. Монтаж стальных колонн. Плейсхолдеры: {object}, {number}, {date}, {count}, {weight}, {mark}.',
  },
  {
    id: 'aosr-tmpl-22',
    name: 'АОСР — Монтаж металлических балок и ферм',
    workType: 'монтажные',
    description: 'ГЭСН 09-01-015. Монтаж стальных балок. Плейсхолдеры: {object}, {number}, {date}, {count}, {weight}.',
  },
  {
    id: 'aosr-tmpl-23',
    name: 'АОСР — Установка оконных блоков ПВХ',
    workType: 'монтажные',
    description: 'ГЭСН 10-01-039. Установка оконных блоков с ПВХ профилем. Плейсхолдеры: {object}, {number}, {date}, {count}, {area}.',
  },
  {
    id: 'aosr-tmpl-24',
    name: 'АОСР — Монтаж сэндвич-панелей',
    workType: 'монтажные',
    description: 'ТУ производителя. Монтаж ограждающих панелей. Плейсхолдеры: {object}, {number}, {date}, {area}, {thickness}, {brand}.',
  },
  {
    id: 'aosr-tmpl-25',
    name: 'АОСР — Монтаж трубопроводов водоснабжения',
    workType: 'монтажные',
    description: 'СП 73.13330.2016. Трубопроводы внутри зданий. Плейсхолдеры: {object}, {number}, {date}, {length}, {diameter}, {material}.',
  },
  {
    id: 'aosr-tmpl-26',
    name: 'АОСР — Монтаж трубопроводов канализации',
    workType: 'монтажные',
    description: 'СП 30.13330.2020. Внутренний водопровод и канализация. Плейсхолдеры: {object}, {number}, {date}, {length}, {diameter}.',
  },
  {
    id: 'aosr-tmpl-27',
    name: 'АОСР — Прокладка кабельных трасс',
    workType: 'монтажные',
    description: 'СП 256.1325800.2016. Электроустановки. Плейсхолдеры: {object}, {number}, {date}, {length}, {section}, {brand}.',
  },
  {
    id: 'aosr-tmpl-28',
    name: 'АОСР — Монтаж вентиляционных воздуховодов',
    workType: 'монтажные',
    description: 'СП 60.13330.2020. Отопление, вентиляция и кондиционирование. Плейсхолдеры: {object}, {number}, {date}, {length}, {section}.',
  },
  {
    id: 'aosr-tmpl-29',
    name: 'АОСР — Монтаж наружных стеновых панелей',
    workType: 'монтажные',
    description: 'ГЭСН 07-01-001. Монтаж ж/б панелей. Плейсхолдеры: {object}, {number}, {date}, {count}, {area}.',
  },
  {
    id: 'aosr-tmpl-30',
    name: 'АОСР — Установка дверных блоков',
    workType: 'монтажные',
    description: 'ГЭСН 10-01-046. Установка дверных блоков. Плейсхолдеры: {object}, {number}, {date}, {count}, {area}, {type}.',
  },

  // ─── КРОВЕЛЬНЫЕ (10) ───
  {
    id: 'aosr-tmpl-31',
    name: 'АОСР — Устройство пароизоляционного слоя кровли',
    workType: 'кровельные',
    description: 'СП 17.13330.2017. Кровли. Пароизоляция. Плейсхолдеры: {object}, {number}, {date}, {area}, {material}, {brand}.',
  },
  {
    id: 'aosr-tmpl-32',
    name: 'АОСР — Устройство теплоизоляции кровли',
    workType: 'кровельные',
    description: 'СП 17.13330.2017. Кровли. Утепление. Плейсхолдеры: {object}, {number}, {date}, {area}, {thickness}, {brand}.',
  },
  {
    id: 'aosr-tmpl-33',
    name: 'АОСР — Устройство гидроизоляционного ковра кровли',
    workType: 'кровельные',
    description: 'СП 17.13330.2017. Наплавляемая гидроизоляция. Плейсхолдеры: {object}, {number}, {date}, {area}, {layers}, {material}.',
  },
  {
    id: 'aosr-tmpl-34',
    name: 'АОСР — Монтаж профнастила кровли',
    workType: 'кровельные',
    description: 'ГЭСН 12-01-015. Покрытие кровли профлистом. Плейсхолдеры: {object}, {number}, {date}, {area}, {brand}, {thickness}.',
  },
  {
    id: 'aosr-tmpl-35',
    name: 'АОСР — Устройство примыканий кровли',
    workType: 'кровельные',
    description: 'СП 17.13330.2017. Примыкания к парапетам и стенам. Плейсхолдеры: {object}, {number}, {date}, {length}, {material}.',
  },
  {
    id: 'aosr-tmpl-36',
    name: 'АОСР — Монтаж водосточной системы',
    workType: 'кровельные',
    description: 'СП 17.13330.2017. Водосточные системы. Плейсхолдеры: {object}, {number}, {date}, {length}, {diameter}, {brand}.',
  },
  {
    id: 'aosr-tmpl-37',
    name: 'АОСР — Устройство плоской кровли (инверсионной)',
    workType: 'кровельные',
    description: 'СП 17.13330.2017. Инверсионная кровля. Плейсхолдеры: {object}, {number}, {date}, {area}, {layers}, {material}.',
  },
  {
    id: 'aosr-tmpl-38',
    name: 'АОСР — Антикоррозионная обработка металлических конструкций кровли',
    workType: 'кровельные',
    description: 'ГЭСН 13-03-002. Антикоррозионное покрытие. Плейсхолдеры: {object}, {number}, {date}, {area}, {brand}, {layers}.',
  },
  {
    id: 'aosr-tmpl-39',
    name: 'АОСР — Устройство аэраторов кровли',
    workType: 'кровельные',
    description: 'ТУ производителя. Аэраторы для плоской кровли. Плейсхолдеры: {object}, {number}, {date}, {count}, {brand}.',
  },
  {
    id: 'aosr-tmpl-40',
    name: 'АОСР — Монтаж металлических ограждений кровли',
    workType: 'кровельные',
    description: 'ГОСТ Р 53254-2009. Ограждения кровли. Плейсхолдеры: {object}, {number}, {date}, {length}, {height}.',
  },

  // ─── ОТДЕЛОЧНЫЕ (10) ───
  {
    id: 'aosr-tmpl-41',
    name: 'АОСР — Штукатурка стен цементно-песчаным раствором',
    workType: 'отделочные',
    description: 'ГЭСН 15-01-001. Штукатурка внутренних поверхностей. Плейсхолдеры: {object}, {number}, {date}, {area}, {thickness}.',
  },
  {
    id: 'aosr-tmpl-42',
    name: 'АОСР — Шпатлёвка стен',
    workType: 'отделочные',
    description: 'ГЭСН 15-04-005. Шпатлёвка поверхностей. Плейсхолдеры: {object}, {number}, {date}, {area}, {layers}, {brand}.',
  },
  {
    id: 'aosr-tmpl-43',
    name: 'АОСР — Окраска стен водно-дисперсионными составами',
    workType: 'отделочные',
    description: 'ГЭСН 15-04-001. Окраска внутренних поверхностей. Плейсхолдеры: {object}, {number}, {date}, {area}, {brand}, {color}.',
  },
  {
    id: 'aosr-tmpl-44',
    name: 'АОСР — Укладка керамической плитки на стенах',
    workType: 'отделочные',
    description: 'ГЭСН 11-01-033. Облицовка стен плиткой. Плейсхолдеры: {object}, {number}, {date}, {area}, {format}, {brand}.',
  },
  {
    id: 'aosr-tmpl-45',
    name: 'АОСР — Укладка керамогранита на полу',
    workType: 'отделочные',
    description: 'ГЭСН 11-01-001. Укладка плиток на полу. Плейсхолдеры: {object}, {number}, {date}, {area}, {format}, {brand}.',
  },
  {
    id: 'aosr-tmpl-46',
    name: 'АОСР — Устройство подвесных потолков (Армстронг)',
    workType: 'отделочные',
    description: 'ГЭСН 15-01-080. Подвесные потолки. Плейсхолдеры: {object}, {number}, {date}, {area}, {brand}.',
  },
  {
    id: 'aosr-tmpl-47',
    name: 'АОСР — Устройство стяжки пола',
    workType: 'отделочные',
    description: 'ГЭСН 11-01-001. Цементно-песчаная стяжка. Плейсхолдеры: {object}, {number}, {date}, {area}, {thickness}, {mix}.',
  },
  {
    id: 'aosr-tmpl-48',
    name: 'АОСР — Оклейка стен обоями',
    workType: 'отделочные',
    description: 'ГЭСН 15-06-001. Оклейка поверхностей обоями. Плейсхолдеры: {object}, {number}, {date}, {area}, {brand}.',
  },
  {
    id: 'aosr-tmpl-49',
    name: 'АОСР — Устройство наливного пола',
    workType: 'отделочные',
    description: 'ТУ производителя. Полимерный наливной пол. Плейсхолдеры: {object}, {number}, {date}, {area}, {thickness}, {brand}.',
  },
  {
    id: 'aosr-tmpl-50',
    name: 'АОСР — Монтаж гипсокартонных перегородок',
    workType: 'отделочные',
    description: 'ГЭСН 08-02-001. Перегородки из ГКЛ. Плейсхолдеры: {object}, {number}, {date}, {area}, {height}, {brand}.',
  },
];

export async function seedAosrTemplates(prisma: PrismaClient): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const tpl of AOSR_TEMPLATES) {
    const { id, ...data } = tpl;
    const result = await prisma.documentTemplate.upsert({
      where: { id },
      create: {
        id,
        category: 'AOSR',
        format: 'docx',
        version: '1.0',
        isActive: true,
        isPublic: true,
        localPath: 'templates/docx/aosr.docx',
        organizationId: null,
        ...data,
      },
      update: {
        name: data.name,
        workType: data.workType,
        description: data.description,
        isActive: true,
        isPublic: true,
      },
    });
    if (result.id === id) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`Шаблоны АОСР: ${created} создано, ${updated} обновлено (всего ${AOSR_TEMPLATES.length})`);
}
