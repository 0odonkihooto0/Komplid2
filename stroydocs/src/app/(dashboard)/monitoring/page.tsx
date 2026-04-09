import type { Metadata } from 'next';
import { MonitoringContent } from './MonitoringContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Мониторинг — StroyDocs',
};

export default function MonitoringPage() {
  return <MonitoringContent />;
}
