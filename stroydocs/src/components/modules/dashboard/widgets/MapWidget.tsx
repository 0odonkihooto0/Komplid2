'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

interface ObjectSummary {
  id: string;
  name: string;
  address: string | null;
  status: string;
  idReadinessPct: number;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps: any;
  }
}

export function MapWidget() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  const { data: objects = [], isLoading } = useQuery<ObjectSummary[]>({
    queryKey: ['dashboard-objects-summary'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/objects-summary');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Загружаем Яндекс.Карты API
  useEffect(() => {
    if (!apiKey || typeof window === 'undefined') return;
    if (window.ymaps) { setMapReady(true); return; }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => setMapReady(true));
    };
    document.head.appendChild(script);
  }, [apiKey]);

  // Инициализируем карту и добавляем метки
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || objects.length === 0) return;

    const ymaps = window.ymaps;
    const map = new ymaps.Map(mapContainerRef.current, {
      center: [55.75, 37.61], // Москва по умолчанию
      zoom: 5,
      controls: ['zoomControl'],
    });

    // Геокодируем адреса и добавляем метки
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

  if (!apiKey) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            Карта объектов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Для отображения карты укажите <code>NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code> в переменных окружения.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          Карта объектов
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-xl">
        {isLoading || !mapReady ? (
          <Skeleton className="h-64 w-full rounded-none" />
        ) : (
          <div ref={mapContainerRef} style={{ height: 256, width: '100%' }} />
        )}
      </CardContent>
    </Card>
  );
}
