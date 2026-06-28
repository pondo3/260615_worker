import { type NextRequest } from 'next/server'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { fetchChannelInfo, collectChannelVideos, getActiveApiKey } from '@/lib/youtube-collect'

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession()
    const body = await request.json()
    const {
      channel_db_ids,
      min_views = 0,
      max_days_old = 30,
      min_likes = 0,
      min_comments = 0,
    } = body as {
      channel_db_ids: number[]
      min_views?: number
      max_days_old?: number
      min_likes?: number
      min_comments?: number
    }

    if (!channel_db_ids?.length) {
      return Response.json({ error: '채널을 선택해주세요.' }, { status: 400 })
    }

    const apiKey = await getActiveApiKey(session.userId)
    if (!apiKey) {
      return Response.json({ error: 'YouTube API 키가 설정되지 않았습니다.' }, { status: 400 })
    }

    // 선택된 채널이 해당 유저 소유인지 확인
    const channels = await prisma.channel.findMany({
      where: { id: { in: channel_db_ids }, userId: session.userId, isActive: true },
    })

    let collected = 0
    let skipped = 0

    for (const channel of channels) {
      // uploads playlist ID가 필요하므로 채널 정보 재조회
      const info = await fetchChannelInfo(channel.channelId, apiKey)
      if (!info?.uploadsPlaylistId) continue

      const videos = await collectChannelVideos(
        channel.channelId,
        info.uploadsPlaylistId,
        max_days_old,
        min_views,
        min_likes,
        min_comments,
        apiKey,
      )

      for (const v of videos) {
        try {
          const videoUrl = `https://www.youtube.com/watch?v=${v.videoId}`
          const existing = await prisma.material.findFirst({
            where: { userId: session.userId, videoId: v.videoId },
          })
          if (existing) {
            await prisma.material.update({
              where: { id: existing.id },
              data: { viewCount: v.viewCount, likeCount: v.likeCount, commentCount: v.commentCount },
            })
          } else {
            await prisma.material.create({
              data: {
                userId: session.userId,
                url: videoUrl,
                platform: 'youtube',
                videoId: v.videoId,
                originalTitle: v.title,
                channelName: v.channelName,
                channelId: v.channelId,
                viewCount: v.viewCount,
                likeCount: v.likeCount,
                commentCount: v.commentCount,
                uploadedAt: v.publishedAt ? new Date(v.publishedAt) : null,
                thumbnailUrl: v.thumbnailUrl,
              },
            })
          }
          collected++
        } catch {
          skipped++
        }
      }
    }

    return Response.json({ collected, skipped })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '수집 중 오류가 발생했습니다.'
    return Response.json({ error: msg }, { status: 500 })
  }
}
