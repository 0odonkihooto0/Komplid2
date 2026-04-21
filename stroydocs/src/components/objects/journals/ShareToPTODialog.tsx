'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  projectId: string;
  journalId: string;
  journalTitle: string;
  children?: React.ReactNode;
}

type Expiry = '7' | '30' | 'none';

const EXPIRY_OPTIONS: { value: Expiry; label: string }[] = [
  { value: '7', label: '7 дней' },
  { value: '30', label: '30 дней' },
  { value: 'none', label: 'Бессрочно' },
];

export function ShareToPTODialog({ projectId, journalId, journalTitle, children }: Props) {
  const [open, setOpen] = useState(false);
  const [expiry, setExpiry] = useState<Expiry>('30');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const createLink = async () => {
    setIsPending(true);
    try {
      const body: { expiresInDays?: number | null } = {
        expiresInDays: expiry === 'none' ? null : parseInt(expiry, 10),
      };
      const res = await fetch(
        `/api/projects/${projectId}/journals/${journalId}/share`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (json.success) {
        setShareUrl(`${window.location.origin}${json.data.url}`);
      }
    } finally {
      setIsPending(false);
    }
  };

  const revokeLink = async () => {
    await fetch(`/api/projects/${projectId}/journals/${journalId}/share`, {
      method: 'DELETE',
    });
    setShareUrl(null);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = shareUrl
    ? `Привет! Направляю вам журнал «${journalTitle}». По этой ссылке вы можете просмотреть записи и создать АОСР в ИД-Мастер: ${shareUrl}`
    : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Отправить в ПТО
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отправить журнал ПТО-инженеру</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Создайте публичную ссылку на журнал. ПТО-инженер сможет просмотреть записи и
            сгенерировать АОСР в ИД-Мастер.
          </p>

          {!shareUrl ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Срок действия ссылки</Label>
                <Select value={expiry} onValueChange={(v) => setExpiry(v as Expiry)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createLink} disabled={isPending} className="w-full">
                {isPending ? 'Создание ссылки...' : 'Создать ссылку'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-sm" />
                <Button size="icon" variant="outline" onClick={copyLink} aria-label="Скопировать">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                      '_blank'
                    )
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() =>
                    window.open(
                      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Журнал «${journalTitle}»`)}`,
                      '_blank'
                    )
                  }
                >
                  <Send className="h-4 w-4" />
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() =>
                    window.open(
                      `mailto:?subject=${encodeURIComponent(`Журнал «${journalTitle}»`)}&body=${encodeURIComponent(shareText)}`,
                      '_blank'
                    )
                  }
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={revokeLink} className="w-full text-destructive hover:text-destructive">
                Отозвать ссылку
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
