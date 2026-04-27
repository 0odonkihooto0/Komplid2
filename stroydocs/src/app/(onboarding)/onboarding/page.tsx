import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Маппинг onboardingStep → следующий маршрут
const STEP_ROUTES: Record<string, string> = {
  INTENT_SET: '/onboarding/workspace',
  WORKSPACE_CREATED: '/onboarding/plan',
  PLAN_CHOSEN: '/onboarding/invite',
  TEAM_INVITED: '/onboarding/first-project',
  FIRST_PROJECT_CREATED: '/onboarding/done',
};

export default async function OnboardingIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  if (session.user.onboardingCompleted) redirect('/objects');

  // Читаем актуальный шаг из БД (токен мог устареть)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingStep: true, intent: true, onboardingCompleted: true },
  });

  // JWT мог устареть — проверяем флаг в БД
  if (user?.onboardingCompleted) redirect('/objects');

  const step = user?.onboardingStep;

  // Явный шаг COMPLETED — редирект в приложение
  if (step === 'COMPLETED') redirect('/objects');

  if (step && STEP_ROUTES[step]) {
    // Если intent === CUSTOMER_PRIVATE — пропускаем workspace
    if (step === 'INTENT_SET' && user?.intent === 'CUSTOMER_PRIVATE') {
      redirect('/onboarding/plan');
    }
    redirect(STEP_ROUTES[step]);
  }

  // Первый визит — шаг выбора роли
  redirect('/onboarding/role');
}
