import AcceptInvitationForm from '@/components/guest/AcceptInvitationForm';

// Публичная страница принятия гостевого приглашения — авторизация не требуется
export default function AcceptGuestPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full">
        <AcceptInvitationForm token={params.token} />
      </div>
    </div>
  );
}
