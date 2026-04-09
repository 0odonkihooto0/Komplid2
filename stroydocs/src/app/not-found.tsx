import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Страница не найдена</p>
      <Button asChild className="mt-6">
        <Link href="/">На главную</Link>
      </Button>
    </div>
  );
}
