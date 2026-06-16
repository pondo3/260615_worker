'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export type YoutubeInfoResult =
  | {
      success: true
      title: string
      channelName?: string
      channelId?: string
      publishedAt?: string
      description?: string
      duration?: string
      thumbnailUrl?: string
      viewCount?: string
      likeCount?: string
      commentCount?: string
      privacyStatus?: string
    }
  | { success: false; error: string }

type YtCallResult = YoutubeInfoResult & {
  isKeyError?: boolean
  isQuotaExceeded?: boolean
}

function extractYoutubeId(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (/(?:www\.|m\.)?youtube\.com/.test(u.hostname)) {
      const v = u.searchParams.get('v')
      if (v) return v
      const shorts = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
      if (shorts) return shorts[1]
      const embed = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/)
      if (embed) return embed[1]
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      if (id) return id
    }
  } catch {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    return m?.[1] ?? null
  }
  return null
}

async function callOEmbed(videoId: string): Promise<YoutubeInfoResult> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cache: 'no-store' }
    )
    if (!res.ok) {
      return { success: false, error: 'API 키가 설정되지 않았습니다. 직접 입력해주세요.' }
    }
    const data = await res.json()
    return {
      success: true,
      title: data.title ?? '',
      channelName: data.author_name,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  } catch {
    return { success: false, error: 'API 키가 설정되지 않았습니다. 직접 입력해주세요.' }
  }
}

// 단일 API 키로 YouTube 호출
async function callSingleKey(videoId: string, apiKey: string): Promise<YtCallResult> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics,status`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const reason = errData?.error?.errors?.[0]?.reason as string | undefined

      if (reason === 'quotaExceeded') {
        return { success: false, error: 'YouTube API quota를 초과했습니다.', isKeyError: true, isQuotaExceeded: true }
      }
      if (reason === 'keyInvalid' || res.status === 400) {
        return { success: false, error: 'YouTube API 키가 잘못되었습니다.', isKeyError: true }
      }
      if (res.status === 403) {
        return { success: false, error: 'YouTube API 키 권한이 없습니다.', isKeyError: true }
      }
      return { success: false, error: `YouTube API 오류가 발생했습니다. (${res.status})`, isKeyError: false }
    }

    const data = await res.json()
    if (!data.items?.length) {
      return { success: false, error: '영상을 찾을 수 없습니다. 비공개 또는 삭제된 영상일 수 있습니다.', isKeyError: false }
    }

    const item = data.items[0]
    const snippet = item.snippet ?? {}
    const contentDetails = item.contentDetails ?? {}
    const statistics = item.statistics ?? {}
    const status = item.status ?? {}

    const thumbnails = snippet.thumbnails ?? {}
    const thumbnailUrl: string =
      thumbnails.maxres?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    return {
      success: true,
      title: snippet.title ?? '',
      channelName: snippet.channelTitle ?? '',
      channelId: snippet.channelId ?? '',
      publishedAt: snippet.publishedAt ?? '',
      description: snippet.description ?? '',
      duration: contentDetails.duration ?? '',
      thumbnailUrl,
      viewCount: statistics.viewCount ?? '',
      likeCount: statistics.likeCount ?? '',
      commentCount: statistics.commentCount ?? '',
      privacyStatus: status.privacyStatus ?? '',
    }
  } catch {
    return { success: false, error: '유튜브 정보를 가져오지 못했습니다.', isKeyError: false }
  }
}

// DB 키 → 환경변수 키 → oEmbed 순으로 시도
async function callYoutubeDataApi(videoId: string, userId?: number): Promise<YoutubeInfoResult> {
  // 1. DB에 등록된 키 순서대로 시도
  if (userId) {
    const dbKeys = await prisma.apiKey.findMany({
      where: { userId, service: 'youtube', isActive: true, quotaExceeded: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    for (const key of dbKeys) {
      const result = await callSingleKey(videoId, key.keyValue)

      if (result.success) {
        await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date(), lastError: null } }).catch(() => {})
        return result
      }

      if (result.isKeyError) {
        // 키 문제 → 다음 키로 순환
        const updateData: { lastError: string; quotaExceeded?: boolean } = { lastError: result.error }
        if (result.isQuotaExceeded) updateData.quotaExceeded = true
        await prisma.apiKey.update({ where: { id: key.id }, data: updateData }).catch(() => {})
        continue
      }

      // 영상 자체 문제(비공개·삭제 등) → 키 순환 없이 바로 반환
      return result
    }
  }

  // 2. 환경변수 키
  const envKey = process.env.YOUTUBE_API_KEY
  if (envKey) {
    const result = await callSingleKey(videoId, envKey)
    if (result.success || !result.isKeyError) return result
    // 환경변수 키도 키 에러 → oEmbed로 낙하
  }

  // 3. oEmbed 낙하
  return callOEmbed(videoId)
}

export async function fetchYoutubeInfo(videoId: string): Promise<YoutubeInfoResult> {
  if (!videoId) return { success: false, error: '유효하지 않은 유튜브 영상 ID입니다.' }
  const session = await verifySession()
  return callYoutubeDataApi(videoId, session.userId)
}

export async function refreshYoutubeData(resourceId: number): Promise<{ success: boolean; error?: string }> {
  const session = await verifySession()

  const resource = await prisma.resourceLink.findUnique({ where: { id: resourceId } })
  if (!resource || resource.userId !== session.userId) {
    return { success: false, error: '권한이 없습니다.' }
  }

  const ytId = resource.ytVideoId || extractYoutubeId(resource.url)
  if (!ytId) {
    return { success: false, error: '유튜브 영상 ID를 찾을 수 없습니다.' }
  }

  const result = await callYoutubeDataApi(ytId, session.userId)

  if (!result.success) {
    await prisma.resourceLink.update({
      where: { id: resourceId },
      data: {
        ytVideoId: ytId,
        ytApiLastFetched: new Date(),
        ytApiFetchSuccess: false,
        ytApiError: result.error,
      },
    })
    revalidatePath('/resources')
    return { success: false, error: result.error }
  }

  await prisma.resourceLink.update({
    where: { id: resourceId },
    data: {
      ytVideoId: ytId,
      ytOriginalTitle: result.title || null,
      ytChannelName: result.channelName || null,
      ytChannelId: result.channelId || null,
      ytPublishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
      ytDescription: result.description || null,
      ytDuration: result.duration || null,
      thumbnailUrl: result.thumbnailUrl || null,
      thumbnailSource: 'youtube',
      ytViewCount: result.viewCount || null,
      ytLikeCount: result.likeCount || null,
      ytCommentCount: result.commentCount || null,
      ytPrivacyStatus: result.privacyStatus || null,
      ytApiLastFetched: new Date(),
      ytApiFetchSuccess: true,
      ytApiError: null,
    },
  })

  revalidatePath('/resources')
  return { success: true }
}
