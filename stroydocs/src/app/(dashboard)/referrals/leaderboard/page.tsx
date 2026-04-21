'use client';

import Link from 'next/link';
import { LeaderboardTable } from '@/components/referrals/LeaderboardTable';

export default function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/referrals" className="text-sm text-blue-600 hover:underline">
          ← Реферальная программа
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Топ партнёров</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Рейтинг пользователей, которые больше всего привели платящих коллег.
          Имена и суммы обезличены.
        </p>
      </div>
      <LeaderboardTable />
    </div>
  );
}
