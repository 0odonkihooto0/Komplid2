'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Send, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SignDocumentWizardProps {
  docId: string;
  docTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

/** Мастер подписи исполнительного документа — 3 шага: отправка кода, ввод кода, успех */
export function SignDocumentWizard({ docId, docTitle, onClose, onSuccess }: SignDocumentWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [signatureId, setSignatureId] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Шаг 1 → 2: инициируем подпись, получаем signatureId и запускаем отправку кода
  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/guest/execution-docs/${docId}/sign`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Не удалось отправить код');
        return;
      }

      setSignatureId(json.data.signatureId);
      setStep(2);
    } catch {
      setError('Ошибка соединения. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2 → 3: подтверждаем код подписи
  const handleConfirmCode = async () => {
    if (code.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/guest/signatures/${signatureId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Неверный код');
        return;
      }

      setStep(3);
    } catch {
      setError('Ошибка соединения. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
        {/* Шаг 1: Подтверждение намерения подписать */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-lg font-semibold">Подписать документ</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Вы собираетесь подписать документ:
            </p>
            <p className="font-medium text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
              {docTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              На ваш email или телефон будет отправлен код подтверждения.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleSendCode} disabled={loading} className="flex-1 gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Отправить код
              </Button>
            </div>
          </>
        )}

        {/* Шаг 2: Ввод 6-значного кода */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3">
              <KeyRound className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-lg font-semibold">Введите код</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Код отправлен на ваш email или телефон. Он действителен 10 минут.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                // Принимаем только цифры
                setCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              className="text-center text-xl tracking-widest"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="flex-1">
                Назад
              </Button>
              <Button onClick={handleConfirmCode} disabled={loading || code.length !== 6} className="flex-1 gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Подтвердить
              </Button>
            </div>
          </>
        )}

        {/* Шаг 3: Успешное подписание */}
        {step === 3 && (
          <>
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h2 className="text-lg font-semibold">Документ подписан</h2>
              <p className="text-sm text-muted-foreground">
                Ваша подпись успешно подтверждена и сохранена в системе.
              </p>
            </div>
            <Button
              onClick={() => { onSuccess(); onClose(); }}
              className="w-full"
            >
              Готово
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
