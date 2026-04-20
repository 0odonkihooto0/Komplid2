'use client';

export function OfflineReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
    >
      Попробовать снова
    </button>
  );
}
