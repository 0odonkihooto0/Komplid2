export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import AiLawyerChat from '@/components/customer/AiLawyerChat';

export default function AiLawyerPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">AI-юрист</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Задайте вопрос о строительном праве РФ. Отвечаю на основе ГК РФ гл.37, ФЗ-2300-1, ГОСТ Р 70108-2025.
      </p>
      <Suspense>
        <AiLawyerChat />
      </Suspense>
    </div>
  );
}
