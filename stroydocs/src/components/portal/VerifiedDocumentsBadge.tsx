import { ShieldCheck, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface VerifiedDocumentsBadgeProps {
  signedDocCount: number;
  recentDocs?: Array<{ id: string; qrToken?: string | null; title: string }>;
}

// Блок верификации — показывает число подписанных актов ИД с QR-ссылками
export function VerifiedDocumentsBadge({ signedDocCount, recentDocs }: VerifiedDocumentsBadgeProps) {
  if (signedDocCount === 0) return null;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" aria-label="Верифицировано" />
          <div>
            <p className="font-semibold text-sm">Подписано актов скрытых работ: {signedDocCount}</p>
            <Badge variant="secondary" className="mt-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Верифицировано StroyDocs
            </Badge>
          </div>
        </div>

        {/* Если актов мало — показываем ссылки на каждый с QR-верификацией */}
        {signedDocCount < 5 && recentDocs && recentDocs.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                {doc.qrToken ? (
                  <a
                    href={`/docs/verify/${doc.qrToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {doc.title}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground truncate">{doc.title}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
