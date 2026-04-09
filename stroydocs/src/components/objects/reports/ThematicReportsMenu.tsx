'use client'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FileText, BarChart2, CalendarDays, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { ReactNode } from 'react'

interface ThematicConfig {
  id: string
  slug: string
  name: string
  category: string
}

const CATEGORY_ICONS: Record<string, ReactNode> = {
  'СК': <FileText className="h-5 w-5 text-orange-500" aria-label="Строительный контроль" />,
  'СМР': <BarChart2 className="h-5 w-5 text-blue-500" aria-label="СМР" />,
  'ГПР': <CalendarDays className="h-5 w-5 text-green-500" aria-label="График работ" />,
  'Финансовые': <DollarSign className="h-5 w-5 text-purple-500" aria-label="Финансовые" />,
}

interface Props {
  objectId: string
}

export function ThematicReportsMenu({ objectId }: Props) {
  const router = useRouter()

  const { data: configs, isLoading } = useQuery<ThematicConfig[]>({
    queryKey: ['thematic-configs'],
    queryFn: async () => {
      const res = await fetch('/api/reports/thematic')
      if (!res.ok) throw new Error('Ошибка загрузки')
      const json = await res.json() as { data: ThematicConfig[] }
      return json.data
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  // Группировка по категории
  const grouped = (configs ?? []).reduce<Record<string, ThematicConfig[]>>((acc, cfg) => {
    if (!acc[cfg.category]) acc[cfg.category] = []
    acc[cfg.category].push(cfg)
    return acc
  }, {})

  const categoryOrder = ['СК', 'СМР', 'ГПР', 'Финансовые']

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Тематические отчёты</h2>
      {categoryOrder.filter(cat => grouped[cat]?.length).map(category => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            {CATEGORY_ICONS[category]}
            <h3 className="font-medium text-base">{category}</h3>
            <Badge variant="outline">{grouped[category].length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[category].map(cfg => (
              <Card
                key={cfg.slug}
                className="cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
                onClick={() => router.push(`/objects/${objectId}/reports/thematic/${cfg.slug}`)}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{cfg.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
