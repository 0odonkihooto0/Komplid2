import { cookies } from 'next/headers';
import { setSignupContext, getSignupContext } from '@/lib/tracking/signupContext';
import { SignupHero } from '@/components/auth/SignupHero';
import { SignupForm } from '@/components/auth/SignupForm';

interface Props {
  searchParams: Promise<{
    plan?: string;
    intent?: string;
    ref?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  }>;
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookieStore = await cookies();

  // Если пришли с query params — сохранить/обновить контекст поверх существующего cookie
  const hasParams = params.plan || params.intent || params.ref || params.utm_source;
  if (hasParams) {
    const existing = getSignupContext(cookieStore);
    setSignupContext(cookieStore, {
      ...existing,
      ...(params.plan && { plan: params.plan }),
      ...(params.intent && { intent: params.intent }),
      ...(params.ref && { referredByCode: params.ref }),
      ...(params.utm_source && { utmSource: params.utm_source }),
      ...(params.utm_medium && { utmMedium: params.utm_medium }),
      ...(params.utm_campaign && { utmCampaign: params.utm_campaign }),
      ...(params.utm_content && { utmContent: params.utm_content }),
      ...(params.utm_term && { utmTerm: params.utm_term }),
    });
  }

  const ctx = getSignupContext(cookieStore);

  return (
    <div className="flex min-h-screen">
      <SignupHero
        intent={ctx.intent}
        planCode={ctx.plan}
        referredByCode={ctx.referredByCode}
      />
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-muted/30 px-8 py-10">
        <div className="w-full max-w-md space-y-6">
          {/* Логотип только на мобильных — на десктопе его заменяет левая колонка */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold text-primary">StroyDocs</h1>
          </div>
          <SignupForm
            intent={ctx.intent}
            planCode={ctx.plan}
            referredByCode={ctx.referredByCode}
          />
        </div>
      </div>
    </div>
  );
}
