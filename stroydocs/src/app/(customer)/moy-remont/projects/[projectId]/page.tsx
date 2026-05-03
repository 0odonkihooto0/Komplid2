export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, CreditCard, Package, FileText, ArrowLeft } from 'lucide-react';

interface Props {
  params: { projectId: string };
}

async function fetchProject(projectId: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/customer/projects/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.success ? json.data : null;
}

const SECTIONS = [
  { href: 'checklists', icon: ClipboardCheck, title: 'Чек-листы скрытых работ', description: 'Контролируйте качество скрытых работ' },
  { href: 'payments',   icon: CreditCard,     title: 'Трекер оплат',             description: 'Фиксируйте все платежи подрядчику' },
  { href: 'materials',  icon: Package,         title: 'Трекер материалов',        description: 'Учёт строительных материалов' },
  { href: 'claims',     icon: FileText,        title: 'Претензии',                description: 'Шаблоны претензий по ГОСТ и ГК РФ' },
];

export default async function ProjectPage({ params }: Props) {
  const project = await fetchProject(params.projectId);

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Проект не найден</p>
        <Button variant="link" asChild><Link href="/moy-remont">К проектам</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/moy-remont"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          {project.address && <p className="text-sm text-muted-foreground">{project.address}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={`/moy-remont/projects/${params.projectId}/${href}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
