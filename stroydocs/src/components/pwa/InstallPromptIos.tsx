'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Share } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'pwa-install-ios-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function InstallPromptIos() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/(CriOS|FxiOS)/.test(ua);
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (!isIos || isStandalone) return;

    const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) {
      return;
    }

    const timer = setTimeout(() => setIsVisible(true), 30_000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50">
      <CardContent className="relative p-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="absolute right-2 top-2"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="mb-2 font-medium">Установите StroyDocs на iPhone</div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>
            1. Нажмите <Share className="inline h-4 w-4" /> в нижней панели Safari
          </div>
          <div>2. Выберите «На экран «Домой»»</div>
        </div>
      </CardContent>
    </Card>
  );
}
