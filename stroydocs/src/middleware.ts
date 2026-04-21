import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

// Защищаем все маршруты дашборда (включая корень /)
export const config = {
  matcher: [
    '/',
    '/objects/:path*',
    '/organizations/:path*',
    '/documents/:path*',
    '/onboarding/:path*',
  ],
};
