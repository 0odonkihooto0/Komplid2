import type { UserRole, ProfessionalRole } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      organizationId: string;
      activeWorkspaceId: string | null;
      professionalRole: ProfessionalRole | null;
      onboardingCompleted: boolean;
      activeRole: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId: string;
    activeWorkspaceId: string | null;
    professionalRole: ProfessionalRole | null;
    onboardingCompleted: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId: string;
    firstName: string;
    lastName: string;
    activeWorkspaceId: string | null | undefined;
    professionalRole: ProfessionalRole | null | undefined;
    onboardingCompleted: boolean;
    activeRole: string | null | undefined;
  }
}
