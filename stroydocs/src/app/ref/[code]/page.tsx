import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { ProfessionalRole } from '@prisma/client';
import { setSignupContext } from '@/lib/tracking/signupContext';

const ROLE_LABELS: Record<ProfessionalRole, string> = {
  SMETCHIK: 'сметчик',
  PTO: 'ПТО-инженер',
  FOREMAN: 'прораб',
  SK_INSPECTOR: 'инженер строительного контроля',
  SUPPLIER: 'снабженец',
  PROJECT_MANAGER: 'руководитель проекта',
  ACCOUNTANT: 'бухгалтер',
};

interface Props {
  params: { code: string };
}

export default async function RefLandingPage({ params }: Props) {
  const refCode = await db.referralCode.findUnique({
    where: { code: params.code },
    include: {
      user: {
        select: { firstName: true, lastName: true, professionalRole: true },
      },
    },
  });

  if (!refCode) redirect('/');

  // Инкрементировать clickCount
  await db.referralCode.update({
    where: { id: refCode.id },
    data: { clickCount: { increment: 1 } },
  });

  // Создать запись Referral с NULL referredUserId (заполнится при регистрации)
  const referral = await db.referral.create({
    data: {
      codeId: refCode.id,
      referrerId: refCode.userId,
      referrerRole: refCode.user.professionalRole,
    },
  });

  // Установить cookie с кодом и referralId на 30 дней
  const cookieStore = await cookies();
  cookieStore.set('ref_code', params.code, { maxAge: 30 * 24 * 60 * 60, path: '/' });
  cookieStore.set('ref_referral_id', referral.id, { maxAge: 30 * 24 * 60 * 60, path: '/' });

  // Определить план/intent по роли реферера и сохранить signupContext
  const intentByRole: Record<ProfessionalRole, string> = {
    SMETCHIK: 'ESTIMATOR',
    PTO: 'PTO_ENGINEER',
    FOREMAN: 'CONTRACTOR_INDIVIDUAL',
    SK_INSPECTOR: 'CONSTRUCTION_SUPERVISOR',
    SUPPLIER: 'CONTRACTOR_GENERAL',
    PROJECT_MANAGER: 'CONTRACTOR_GENERAL',
    ACCOUNTANT: 'CONTRACTOR_GENERAL',
  };

  const planByRole: Record<ProfessionalRole, string> = {
    SMETCHIK: 'smetchik_studio',
    PTO: 'id_master',
    FOREMAN: 'prorab_journal',
    SK_INSPECTOR: 'id_master',
    SUPPLIER: 'team',
    PROJECT_MANAGER: 'team',
    ACCOUNTANT: 'team',
  };

  const role = refCode.user.professionalRole;
  await setSignupContext(cookieStore, {
    referredByCode: params.code,
    intent: role ? intentByRole[role] : undefined,
    plan: role ? planByRole[role] : undefined,
    signupSource: `/ref/${params.code}`,
  });

  const referrerName = `${refCode.user.firstName} ${refCode.user.lastName}`;
  const referrerRoleLabel = refCode.user.professionalRole
    ? ROLE_LABELS[refCode.user.professionalRole]
    : 'специалист строительной отрасли';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Лого */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-600">StroyDocs</h1>
          <p className="text-sm text-gray-500">Цифровое управление строительством</p>
        </div>

        {/* Карточка приглашения */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              {refCode.user.firstName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{referrerName}</div>
              <div className="text-sm text-gray-500">{referrerRoleLabel}</div>
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Приглашает вас в <strong>StroyDocs</strong> — профессиональный инструмент
            для строительной документации.
          </p>

          {/* Скидки */}
          <div className="bg-green-50 rounded-xl p-4 mb-5">
            <div className="text-green-800 font-semibold text-sm mb-1">🎁 Ваши бонусы по ссылке</div>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Скидка <strong>30–40%</strong> на первый платёж</li>
              <li>• Бесплатный 14-дневный триал Pro</li>
            </ul>
          </div>

          <Link
            href="/register/solo"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors"
          >
            Зарегистрироваться бесплатно
          </Link>

          <p className="text-xs text-gray-400 text-center mt-3">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-blue-500 hover:underline">
              Войти
            </Link>
          </p>
        </div>

        {/* Краткие фичи */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          {[
            { icon: '📄', label: 'Сметы и ИД' },
            { icon: '📋', label: 'ОЖР онлайн' },
            { icon: '📱', label: 'Мобильное приложение' },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-xl">{f.icon}</div>
              <div className="text-gray-600 mt-1">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
