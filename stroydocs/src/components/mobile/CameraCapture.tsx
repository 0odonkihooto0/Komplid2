'use client';

import { useState, useRef } from 'react';
import { Camera, MapPin, RotateCw, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { photosRepo } from '@/lib/idb/repos/photos-repo';

interface GpsCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Props {
  entityType: 'JOURNAL_ENTRY' | 'DEFECT' | 'WORK_RECORD' | string;
  entityId?: string;
  entityClientId?: string;
  category?: 'CONFIRMING' | 'VIOLATION';
  onCaptured?: (clientId: string) => void;
}

export function CameraCapture({
  entityType,
  entityId,
  entityClientId,
  category,
  onCaptured,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsCoords | null>(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const requestGps = () => {
    if (!('geolocation' in navigator)) return;
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGettingGps(false);
      },
      () => {
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
    });

    setBlob(compressed);
    setPreview(URL.createObjectURL(compressed));
    requestGps();
  };

  const handleSave = async () => {
    if (!blob) return;

    const clientId = crypto.randomUUID();

    await photosRepo.create({
      clientId,
      blob,
      fileName: `photo-${Date.now()}.jpg`,
      mimeType: blob.type,
      size: blob.size,
      entityType,
      entityServerId: entityId,
      entityClientId: entityClientId,
      gpsLat: gps?.lat,
      gpsLng: gps?.lng,
      takenAt: Date.now(),
      category,
      syncStatus: 'pending',
      uploadProgress: 0,
      createdAt: Date.now(),
    });

    onCaptured?.(clientId);
    setPreview(null);
    setBlob(null);
    setGps(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 active:bg-muted">
          <Camera className="h-12 w-12 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Сделать фото</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} className="h-full w-full object-contain" alt="Предпросмотр фото" />
            {gps && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
                <MapPin className="h-3 w-3" />
                {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                <span className="opacity-60">±{Math.round(gps.accuracy)}м</span>
              </div>
            )}
            {gettingGps && (
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                Определяем координаты…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-md border py-3 text-sm"
              onClick={() => {
                setPreview(null);
                setBlob(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              <RotateCw className="mr-1 inline h-4 w-4" /> Пересъёмка
            </button>
            <button
              type="button"
              className="flex-1 rounded-md bg-primary py-3 text-sm text-white"
              onClick={handleSave}
            >
              <Check className="mr-1 inline h-4 w-4" /> Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
