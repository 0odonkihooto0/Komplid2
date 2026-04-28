import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Пути, доступные без авторизации
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/signup',
  '/api/auth',
  '/ref/',
  '/api/health',
  '/sw.js',                // Service Worker — браузер запрашивает без авторизации
  '/swe-worker-',          // Serwist worker entry (динамическое имя swe-worker-<hash>.js)
  '/manifest.webmanifest', // PWA манифест
  '/~offline',             // Serwist offline fallback
];

// Пути, которые не требуют завершённого онбординга (кроме /onboarding)
const ONBOARDING_EXEMPT = [
  '/onboarding',
  '/api/onboarding',
  '/api/users/me/onboarding',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Публичные маршруты — пропускаем без проверки
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req });

  // Не авторизован → на страницу входа
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const onboardingCompleted = token.onboardingCompleted ?? false;
  const isOnboardingPath = pathname.startsWith('/onboarding') || ONBOARDING_EXEMPT.some(p => pathname.startsWith(p));

  // Не завершил онбординг → перенаправляем в /onboarding (кроме API и самого онбординга)
  if (!onboardingCompleted && !isOnboardingPath && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // Завершил онбординг, но пытается вернуться на /onboarding → в приложение
  if (onboardingCompleted && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/objects', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Все маршруты кроме статических ресурсов и _next
    '/((?!_next/static|_next/image|fonts|favicon\\.ico|icons|images|sw\\.js|swe-worker-.*\\.js|workbox-.*\\.js|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)',
  ],
};
