// Промо-блок для привлечения новых пользователей на публичных страницах портала.
// Показывается только если заказчик пришёл не из самого приложения.

interface PromoBlockProps {
  referer?: string;
}

export function PromoBlock({ referer }: PromoBlockProps) {
  // Не показывать пользователям, которые уже работают в приложении
  const isFromApp = referer?.includes('komplid.ru');
  if (isFromApp) return null;

  const signupUrl =
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.komplid.ru'}/signup` +
    '?utm_source=portal&utm_medium=referral';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center mt-8">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Хотите вести свою стройку так же прозрачно?
      </h3>
      <p className="text-blue-700 mb-4 text-sm">
        Komplid — система управления строительной документацией по ГОСТ Р 70108-2025
      </p>
      <a
        href={signupUrl}
        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        target="_blank"
        rel="noopener noreferrer"
      >
        Попробовать бесплатно →
      </a>
    </div>
  );
}
