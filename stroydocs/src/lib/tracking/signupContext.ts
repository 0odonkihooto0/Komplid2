import { cookies } from 'next/headers';

const COOKIE_NAME = 'signup_context';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 дней

// Контекст регистрации — хранит UTM, реферальный код, намерение и preset-план
export interface SignupContext {
  plan?: string;           // код плана: "smetchik_studio", "id_master", "prorab_journal", "team", "corporate"
  intent?: string;         // UserIntent: "ESTIMATOR", "PTO_ENGINEER", "CONTRACTOR_INDIVIDUAL" и т.д.
  referredByCode?: string; // реферальный код
  signupSource?: string;   // откуда пришёл: "/smetchik", "/pto", "/ref/ABC"
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** Сохраняет signupContext в cookie signup_context (HttpOnly=false для client-side доступа) */
export function setSignupContext(cookieStore: CookieStore, ctx: SignupContext): void {
  cookieStore.set(COOKIE_NAME, JSON.stringify(ctx), {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false, // нужен client-side доступ для предзаполнения формы
    sameSite: 'lax',
    path: '/',
  });
}

/** Читает signupContext из cookie. Возвращает {} если cookie нет или JSON невалиден. */
export function getSignupContext(cookieStore: CookieStore): SignupContext {
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SignupContext;
  } catch {
    return {};
  }
}

/** Удаляет cookie signup_context */
export function clearSignupContext(cookieStore: CookieStore): void {
  cookieStore.delete(COOKIE_NAME);
}
