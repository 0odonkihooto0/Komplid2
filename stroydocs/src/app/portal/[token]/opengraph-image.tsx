import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Динамическая OG-картинка для портала заказчика
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/portal/${params.token}`, { cache: 'no-store' });
    const json = res.ok ? await res.json() : null;

    const projectName: string = json?.data?.projectName ?? 'Строительный объект';
    const progress: number = json?.data?.progress ?? 0;
    const address: string | null = json?.data?.address ?? null;

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563EB 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
          }}
        >
          <div style={{ color: '#93c5fd', fontSize: 18, marginBottom: 16, fontFamily: 'sans-serif' }}>
            Komplid — Строительная документация
          </div>
          <div
            style={{
              color: 'white',
              fontSize: 48,
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 16,
              fontFamily: 'sans-serif',
              maxWidth: 900,
            }}
          >
            {projectName}
          </div>
          {address && (
            <div style={{ color: '#bfdbfe', fontSize: 20, marginBottom: 24, fontFamily: 'sans-serif' }}>
              {address}
            </div>
          )}
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '12px 32px',
              color: 'white',
              fontSize: 28,
              fontFamily: 'sans-serif',
            }}
          >
            Выполнено: {progress}%
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#2563EB',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 40,
            fontFamily: 'sans-serif',
          }}
        >
          Komplid — Строительная документация
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
