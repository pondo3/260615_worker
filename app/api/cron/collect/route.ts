import { prisma } from '@/lib/prisma'
import { fetchChannelInfo, collectChannelVideos } from '@/lib/youtube-collect'

// Vercel Cron Job: 매 정시 실행
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel cron 인증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // KST 현재 시각 (UTC+9)
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const currentHour = nowKST.getUTCHours()

  // 현재 시각과 일치하는 활성 룰 조회
  const rules = await prisma.collectionRule.findMany({
    where: { scheduleHour: currentHour, isActive: true },
    include: { channel: true, user: { select: { id: true } } },
  })

  if (rules.length === 0) {
    console.log(`[cron/collect] KST ${currentHour}시 - 실행할 룰 없음`)
    return Response.json({ message: 'no rules', hour: currentHour })
  }

  let totalCollected = 0
  let totalSkipped = 0

  for (const rule of rules) {
    const { user, channel } = rule
    if (!channel.isActive) continue

    // 유저별 API 키 조회
    const dbKeys = await prisma.apiKey.findMany({
      where: { userId: user.id, service: 'youtube', isActive: true, quotaExceeded: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { keyValue: true },
    })
    const apiKey = dbKeys[0]?.keyValue ?? process.env.YOUTUBE_API_KEY
    if (!apiKey) continue

    const info = await fetchChannelInfo(channel.channelId, apiKey)
    if (!info?.uploadsPlaylistId) continue

    const videos = await collectChannelVideos(
      channel.channelId,
      info.uploadsPlaylistId,
      rule.maxDaysOld,
      rule.minViews,
      rule.minLikes,
      rule.minComments,
      apiKey,
    )

    for (const v of videos) {
      try {
        await prisma.material.upsert({
          where: { userId_videoId: { userId: user.id, videoId: v.videoId } },
          create: {
            userId: user.id,
            videoId: v.videoId,
            title: v.title,
            channelName: v.channelName,
            channelId: v.channelId,
            viewCount: v.viewCount,
            likeCount: v.likeCount,
            commentCount: v.commentCount,
            publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
            thumbnailUrl: v.thumbnailUrl,
          },
          update: { viewCount: v.viewCount, likeCount: v.likeCount, commentCount: v.commentCount },
        })
        totalCollected++
      } catch {
        totalSkipped++
      }
    }

    console.log(`[cron/collect] 채널 ${channel.channelName}: ${videos.length}개 처리`)
  }

  console.log(`[cron/collect] KST ${currentHour}시 완료 - 수집 ${totalCollected}개, 중복 ${totalSkipped}개`)
  return Response.json({ collected: totalCollected, skipped: totalSkipped, hour: currentHour })
}
