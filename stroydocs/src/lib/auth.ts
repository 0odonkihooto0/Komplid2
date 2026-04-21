import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,  // 24 часа — снижает риск при компрометации токена
    updateAge: 60 * 60,    // Обновлять токен каждый час активной сессии
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email и пароль обязательны');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          throw new Error('Неверный email или пароль');
        }

        const isPasswordValid = await compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error('Неверный email или пароль');
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          activeWorkspaceId: user.activeWorkspaceId ?? null,
          professionalRole: user.professionalRole ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.activeWorkspaceId = user.activeWorkspaceId;
        token.professionalRole = user.professionalRole;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email!,
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        organizationId: token.organizationId,
        activeWorkspaceId: token.activeWorkspaceId ?? null,
        professionalRole: token.professionalRole ?? null,
      };
      return session;
    },
  },
};
