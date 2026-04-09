import { db } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dbOk = await db.$queryRaw`SELECT 1`.then(() => true).catch(() => false)
  const redisOk = await redis.ping().then((r) => r === 'PONG').catch(() => false)
  const status = dbOk ? 200 : 503

  return Response.json(
    { status: dbOk ? 'ok' : 'degraded', db: dbOk, redis: redisOk },
    { status }
  )
}
