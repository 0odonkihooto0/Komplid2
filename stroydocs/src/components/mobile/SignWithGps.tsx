'use client';

import { useState } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { checkGeofence, type GeofenceCheckResult } from '@/lib/geofencing/distance';

interface GpsData {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Props {
  objectLat: number;
  objectLng: number;
  objectName: string;
  onSign: (gps: GpsData) => Promise<void>;
}

type Status = 'idle' | 'locating' | 'checking' | 'signing';

export function SignWithGps({ objectLat, objectLng, objectName, onSign }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<GeofenceCheckResult | null>(null);

  const handleClick = async () => {
    setStatus('locating');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('checking');
        const check = checkGeofence(
          pos.coords.latitude, pos.coords.longitude,
          objectLat, objectLng
        );
        setResult(check);

        if (!check.isWithin) {
          setStatus('idle');
          return;
        }

        setStatus('signing');
        try {
          await onSign({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        } finally {
          setStatus('idle');
        }
      },
      () => {
        setStatus('idle');
        alert('Не удалось определить координаты. Проверьте разрешение геолокации.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-3">
      {result && !result.isWithin && (
        <div className="flex gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">Вы вне объекта «{objectName}»</div>
            <div className="text-sm">
              Расстояние: {Math.round(result.distance)} м (допустимо до {result.radius} м).
              Подписание возможно, но будет отмечено в аудит-логе.
            </div>
          </div>
        </div>
      )}

      {result && result.isWithin && (
        <div className="flex gap-2 rounded border border-green-200 bg-green-50 p-3 text-green-900">
          <MapPin className="h-5 w-5 shrink-0" />
          <div>Вы на объекте «{objectName}» (±{Math.round(result.distance)} м)</div>
        </div>
      )}

      <button
        type="button"
        className="w-full rounded-md bg-primary py-3 text-white disabled:opacity-50"
        onClick={handleClick}
        disabled={status !== 'idle'}
      >
        {status === 'idle' && 'Подписать с GPS'}
        {status === 'locating' && 'Определяем координаты...'}
        {status === 'checking' && 'Проверяем местоположение...'}
        {status === 'signing' && 'Подписываем...'}
      </button>
    </div>
  );
}
