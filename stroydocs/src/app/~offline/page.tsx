import { OfflineReloadButton } from './OfflineReloadButton';

export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <svg
        className="h-16 w-16 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3l18 18M8.111 8.111A6.75 6.75 0 0112 7.5c2.485 0 4.665 1.34 5.863 3.337M6.529 9.902A9.75 9.75 0 012.25 12c0 5.385 4.365 9.75 9.75 9.75 1.908 0 3.694-.548 5.208-1.499M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <h1 className="text-2xl font-semibold">Нет подключения</h1>
      <p className="max-w-md text-muted-foreground">
        Кажется, вы в офлайне. Просмотреть кэшированные страницы можно, но новые
        действия отправятся автоматически, когда связь появится.
      </p>
      <OfflineReloadButton />
    </main>
  );
}
