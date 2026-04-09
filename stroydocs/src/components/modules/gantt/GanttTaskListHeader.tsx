'use client';

// Кастомный заголовок таблицы задач Ганта с русскими названиями колонок
// gantt-task-react v0.3.x передаёт эти пропсы в TaskListHeader

interface GanttTaskListHeaderProps {
  headerHeight: number;
  fontFamily: string;
  fontSize: string;
  rowWidth: string;
}

export function GanttTaskListHeader({ headerHeight, fontFamily, fontSize, rowWidth }: GanttTaskListHeaderProps) {
  return (
    <div
      className="flex items-center border-b bg-muted/50 font-medium text-muted-foreground select-none"
      style={{ height: headerHeight, fontFamily, fontSize }}
    >
      <div
        className="flex items-center px-3 border-r overflow-hidden"
        style={{ width: rowWidth, minWidth: rowWidth }}
      >
        Наименование работы
      </div>
      <div className="flex items-center px-3 border-r" style={{ width: 100, minWidth: 100 }}>
        Начало
      </div>
      <div className="flex items-center px-3" style={{ width: 100, minWidth: 100 }}>
        Окончание
      </div>
    </div>
  );
}
