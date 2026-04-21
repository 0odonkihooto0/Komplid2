'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';

interface Props {
  code: string;
  shareUrl: string;
  clickCount: number;
  signupCount: number;
  paidCount: number;
  totalBonusRub: number;
  creditBalanceRub: number;
}

export function MyReferralCard({
  code,
  shareUrl,
  clickCount,
  signupCount,
  paidCount,
  totalBonusRub,
  creditBalanceRub,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Ссылка скопирована' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Привет! Я использую StroyDocs — рекомендую. По моей ссылке скидка на первый месяц:')}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Привет! Я использую StroyDocs для строительной документации — рекомендую. По моей ссылке скидка: ${shareUrl}`)}`,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ваш реферальный код</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Код */}
        <div className="bg-gray-50 rounded-lg p-3 font-mono text-lg font-bold text-center tracking-widest text-blue-700">
          {code}
        </div>

        {/* Ссылка */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 truncate">
            {shareUrl}
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Кнопки шаринга */}
        <div className="flex gap-2">
          <a
            href={shareLinks.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Telegram
          </a>
          <a
            href={shareLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t">
          {[
            { label: 'Переходов', value: clickCount },
            { label: 'Регистраций', value: signupCount },
            { label: 'Платящих', value: paidCount },
            { label: 'Бонусов', value: `${Math.floor(totalBonusRub / 100)} ₽` },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-base font-semibold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Баланс кредита */}
        {creditBalanceRub > 0 && (
          <div className="bg-green-50 rounded-lg p-3 text-sm">
            <span className="text-green-700 font-medium">
              Доступный кредит: {Math.floor(creditBalanceRub / 100)} ₽
            </span>
            <span className="text-green-600 ml-1">(применяется при следующей оплате)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
