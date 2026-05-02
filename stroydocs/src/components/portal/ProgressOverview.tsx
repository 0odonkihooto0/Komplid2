'use client';

// График прогресса выполнения работ на публичной странице объекта
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useProgressOverview } from './useProgressOverview';

interface ProgressOverviewProps {
  token: string;
}

// Форматирование даты для оси X
const formatAxisDate = (raw: string) =>
  new Date(raw).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

// Кастомный тултип с датой и процентом выполнения
function ProgressTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const date = new Date(label).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm shadow-sm">
      <p className="text-gray-500">{date}</p>
      <p className="font-semibold text-blue-700">{payload[0].value}% выполнено</p>
    </div>
  );
}

export function ProgressOverview({ token }: ProgressOverviewProps) {
  const { data, isLoading } = useProgressOverview(token);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Прогресс выполнения работ</h2>

      {/* Skeleton-загрузчик */}
      {isLoading && (
        <div className="animate-pulse space-y-2">
          <div className="h-48 bg-gray-100 rounded-lg" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </div>
      )}

      {/* График */}
      {data && (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<ProgressTooltip />} />
              <Area
                type="monotone"
                dataKey="percent"
                fill="#93c5fd"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Итоговый счётчик */}
          <p className="text-sm text-gray-600">
            Подписано{' '}
            <span className="font-semibold text-gray-900">
              {data.points[data.points.length - 1]?.signedDocs ?? 0}
            </span>{' '}
            из <span className="font-semibold text-gray-900">{data.total}</span> актов
          </p>
        </>
      )}
    </section>
  );
}
