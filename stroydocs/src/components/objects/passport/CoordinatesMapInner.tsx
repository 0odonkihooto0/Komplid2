'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trash2, Pencil } from 'lucide-react';
import type { ProjectCoordinate } from './useCoordinates';

// Фикс иконок Leaflet в Next.js (стандартный паттерн для webpack)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Московские координаты по умолчанию если геокодирование не доступно
const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];
const DEFAULT_ZOOM = 10;
const POINT_ZOOM = 14;

interface NominatimResult {
  lat: string;
  lon: string;
}

// Вспомогательный компонент для обновления центра карты при загрузке координат
function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const didFly = useRef(false);
  useEffect(() => {
    if (!didFly.current) {
      map.setView(center, zoom);
      didFly.current = true;
    }
  }, [map, center, zoom]);
  return null;
}

interface Props {
  coordinates: ProjectCoordinate[];
  address: string | null;
  onEdit: (item: ProjectCoordinate) => void;
  onDelete: (id: string) => void;
}

export function CoordinatesMapInner({ coordinates, address, onEdit, onDelete }: Props) {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Геокодирование адреса через Nominatim если нет точек координат
  useEffect(() => {
    if (coordinates.length > 0) {
      setCenter([coordinates[0].latitude, coordinates[0].longitude]);
      setZoom(POINT_ZOOM);
      return;
    }
    if (!address) return;

    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { signal: controller.signal, headers: { 'Accept-Language': 'ru' } }
    )
      .then((r) => r.json())
      .then((results: NominatimResult[]) => {
        if (results.length > 0) {
          setCenter([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
          setZoom(POINT_ZOOM);
        }
      })
      .catch(() => {
        // Молча используем координаты по умолчанию
      });

    return () => controller.abort();
  }, [coordinates, address]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} zoom={zoom} />

      {coordinates.map((coord) => (
        <Marker key={coord.id} position={[coord.latitude, coord.longitude]}>
          <Popup>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Ш:</span> {coord.latitude.toFixed(6)}
              </p>
              <p>
                <span className="font-medium">Д:</span> {coord.longitude.toFixed(6)}
              </p>
              {coord.constructionPhase != null && (
                <p>
                  <span className="font-medium">Очередь:</span> {coord.constructionPhase}
                </p>
              )}
              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => onEdit(coord)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" />
                  Изменить
                </button>
                <button
                  onClick={() => onDelete(coord.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-accent"
                >
                  <Trash2 className="h-3 w-3" />
                  Удалить
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
