import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Добро пожаловать — Komplid',
};

export default function OnboardingGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
