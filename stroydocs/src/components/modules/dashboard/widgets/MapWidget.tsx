'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin } from 'lucide-react';
import { MapWidgetSchema } from './MapWidgetSchema';
import { MapWidgetTable } from './MapWidgetTable';
import { ObjectPassportDialog } from '@/components/objects/ObjectPassportDialog';

interface ObjectSummary {
  id: string;
  name: string;
  address: string | null;
  status: string;
  idReadinessPct: number;
  region: string | null;
  constructionType: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps: any;
  }
}

// Вкладка «Карта» (Яндекс.Карты) — изолирована для управления жизненным циклом
function YandexMapTab({ objects, apiKey }: { objects: ObjectSummary[]; apiKey: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.ymaps) { setMapReady(true); return; }
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps.ready(() => setMapReady(true));
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || objects.length === 0) return;
    const ymaps = window.ymaps;
    const map = new ymaps.Map(mapContainerRef.current, {
      center: [55.75, 37.61],
      zoom: 5,
      controls: ['zoomControl'],
    });
    objects.forEach((obj) => {
      if (!obj.address) return;
      ymaps.geocode(obj.address, { results: 1 }).then((res: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geoObj = (res as any).geoObjects.get(0);
        if (!geoObj) return;
        const coords = geoObj.geometry.getCoordinates();
        const placemark = new ymaps.Placemark(coords, {
          balloonContentHeader: obj.name,
          balloonContentBody: `${obj.address ?? ''}<br/>Готовность ИД: <b>${obj.idReadinessPct}%</b>`,
          hintContent: obj.name,
        }, {
          preset: obj.idReadinessPct >= 80
            ? 'islands#greenDotIcon'
            : obj.idReadinessPct >= 40
              ? 'islands#yellowDotIcon'
              : 'islands#redDotIcon',
        });
        map.geoObjects.add(placemark);
      });
    });
    return () => { map.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, objects]);

  if (!mapReady) return <Skeleton className="h-64 w-full rounded-none" />;
  return <div ref={mapContainerRef} style={{ height: 256, width: '100%' }} />;
}

interface MapWidgetProps {
  objectIds?: string[];
}

export function MapWidget({ objectIds }: MapWidgetProps) {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
  const [passportObjectId, setPassportObjectId] = useState<string | null>(null);

  const { data: objects = [], isLoading } = useQuery<ObjectSummary[]>({
    queryKey: ['dashboard-objects-summary', objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (objectIds && objectIds.length > 0) params.set('objectIds', objectIds.join(','));
      const qs = params.size > 0 ? `?${params.toString()}` : '';
      const res = await fetch(`/api/dashboard/objects-summary${qs}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <ObjectPassportDialog
        objectId={passportObjectId}
        onClose={() => setPassportObjectId(null)}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            Карта объектов
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-none" />
          ) : (
            <Tabs defaultValue="schema" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-transparent h-8 px-3 justify-start gap-1">
                <TabsTrigger value="schema" className="text-xs h-7 px-3">Схема</TabsTrigger>
                <TabsTrigger value="table" className="text-xs h-7 px-3">Таблица</TabsTrigger>
                {apiKey && (
                  <TabsTrigger value="map" className="text-xs h-7 px-3">Карта</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="schema" className="mt-0 p-3">
                <MapWidgetSchema objects={objects} />
              </TabsContent>

              <TabsContent value="table" className="mt-0">
                <MapWidgetTable objects={objects} onObjectClick={setPassportObjectId} />
              </TabsContent>

              {apiKey && (
                <TabsContent value="map" className="mt-0 overflow-hidden rounded-b-xl">
                  <YandexMapTab objects={objects} apiKey={apiKey} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </>
  );
}
