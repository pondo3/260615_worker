import { prisma } from '@/lib/prisma'
import { fetchVideoViewCount, getActiveApiKey } from '@/lib/youtube-collect'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const h12ago = new Date(now.getTime() - 12 * 60 * 60 * 1000)
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // YouTube 링크(videoId 있음)를 가진 테스트 중, 12h 이상 경과한 것만 조회
  const tests = await prisma.test.findMany({
    where: {
      links: { some: { videoId: { not: null } } },
      createdAt: { lte: h12ago },
    },
    include: {
      links: { where: { videoId: { not: null } } },
      snapshots: true,
    },
  })

  let updated = 0

  for (const test of tests) {
    const primaryVideoId = test.links[0]?.videoId
    if (!primaryVideoId) continue

    // 어떤 체크포인트가 필요한지 판단
    const needed: ('after_12h' | 'after_48h')[] = []
    const has12h = test.snapshots.find((s) => s.checkpoint === 'after_12h' && s.value !== null)
    const has48h = test.snapshots.find((s) => s.checkpoint === 'after_48h' && s.value !== null)

    if (!has12h) needed.push('after_12h')
    if (!has48h && test.createdAt <= h48ago) needed.push('after_48h')

    if (needed.length === 0) continue

    try {
      const apiKey = await getActiveApiKey(test.userId)
      if (!apiKey) continue

      const stats = await fetchVideoViewCount(primaryVideoId, apiKey)
      if (!stats) continue

      for (const checkpoint of needed) {
        await prisma.testMetricSnapshot.upsert({
          where: { testId_checkpoint: { testId: test.id, checkpoint } },
          create: { testId: test.id, checkpoint, value: stats.viewCount, memo: '자동 수집' },
          update: { value: stats.viewCount, memo: '자동 수집' },
        })
        updated++
      }
    } catch {
      // 개별 실패는 무시하고 계속
    }
  }

  console.log(`[cron/test-snapshots] 스냅샷 자동 수집 ${updated}건`)
  return Response.json({ updated })
}
