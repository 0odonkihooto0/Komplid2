import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign, Wallet, Ruler, Languages, Handshake, FileType2,
  Receipt, CheckSquare, AlertTriangle, HelpCircle, Library,
  type LucideIcon,
} from 'lucide-react';
import { getReferenceSchema } from '@/lib/references/registry';
import { CATEGORY_LABELS } from '@/lib/references/constants';
import { ReferenceTable } from '@/components/references/ReferenceTable';

const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  Wallet,
  Ruler,
  Languages,
  Handshake,
  FileType2,
  Receipt,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  Library,
};

export default function ReferenceSlugPage({ params }: { params: { slug: string } }) {
  const schema = getReferenceSchema(params.slug);
  if (!schema) notFound();

  const IconComponent = (schema.icon && ICON_MAP[schema.icon]) ? ICON_MAP[schema.icon] : Library;

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/references" className="hover:text-foreground transition-colors">
          Справочники
        </Link>
        <span>/</span>
        <span>{CATEGORY_LABELS[schema.category]}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{schema.name}</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{schema.name}</h1>
          {schema.description && (
            <p className="text-sm text-muted-foreground">{schema.description}</p>
          )}
        </div>
      </div>

      <ReferenceTable schema={schema} />
    </div>
  );
}
