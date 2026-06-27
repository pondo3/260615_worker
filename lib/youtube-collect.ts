// YouTube Data API 수집 공통 헬퍼

export type ChannelInfo = {
  channelId: string
  channelName: string
  thumbnailUrl: string
  uploadsPlaylistId: string
}

export type VideoItem = {
  videoId: string
  title: string
  channelName: string
  channelId: string
  publishedAt: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
}

function buildYouTubeUrl(path: string, params: Record<string, string>, apiKey: string) {
  const p = new URLSearchParams({ ...params, key: apiKey })
  return `https://www.googleapis.com/youtube/v3/${path}?${p}`
}

// URL/핸들/채널ID 에서 채널 정보 조회
export async function fetchChannelInfo(input: string, apiKey: string): Promise<ChannelInfo | null> {
  let param: Record<string, string> = {}

  const trimmed = input.trim()

  // 채널 ID (UC로 시작 22자)
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    param = { id: trimmed }
  // @ 핸들
  } else if (trimmed.startsWith('@')) {
    param = { forHandle: trimmed }
  } else {
    // URL 파싱
    try {
      const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      const pathParts = u.pathname.split('/').filter(Boolean)
      if (pathParts[0] === 'channel' && pathParts[1]) {
        param = { id: pathParts[1] }
      } else if (pathParts[0]?.startsWith('@')) {
        param = { forHandle: pathParts[0] }
      } else if (pathParts[0] === 'c' && pathParts[1]) {
        param = { forUsername: pathParts[1] }
      } else if (pathParts[0] === 'user' && pathParts[1]) {
        param = { forUsername: pathParts[1] }
      } else if (pathParts[0]) {
        // /@handle 형태 또는 /customurl
        param = { forHandle: pathParts[0].startsWith('@') ? pathParts[0] : `@${pathParts[0]}` }
      }
    } catch {
      param = { forHandle: trimmed.startsWith('@') ? trimmed : `@${trimmed}` }
    }
  }

  if (!param || Object.keys(param).length === 0) return null

  const url = buildYouTubeUrl('channels', {
    ...param,
    part: 'snippet,contentDetails',
  }, apiKey)

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null

  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null

  return {
    channelId: item.id,
    channelName: item.snippet?.title ?? '',
    thumbnailUrl:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url || '',
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? '',
  }
}

// 채널의 최근 영상 목록 + 통계 수집
export async function collectChannelVideos(
  channelId: string,
  uploadsPlaylistId: string,
  maxDaysOld: number,
  minViews: number,
  minLikes: number,
  minComments: number,
  apiKey: string,
): Promise<VideoItem[]> {
  if (!uploadsPlaylistId) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxDaysOld)

  // 1. playlistItems로 최근 영상 ID + 기본 snippet 수집 (최대 50개)
  const plUrl = buildYouTubeUrl('playlistItems', {
    playlistId: uploadsPlaylistId,
    part: 'snippet',
    maxResults: '50',
  }, apiKey)

  const plRes = await fetch(plUrl, { cache: 'no-store' })
  if (!plRes.ok) return []

  const plData = await plRes.json()
  const plItems: Array<{ videoId: string; title: string; publishedAt: string; thumbnail: string }> = []

  for (const item of plData.items ?? []) {
    const snippet = item.snippet ?? {}
    const videoId = snippet.resourceId?.videoId
    if (!videoId) continue
    const publishedAt = snippet.publishedAt ?? ''
    if (publishedAt && new Date(publishedAt) < cutoff) continue // 날짜 필터
    plItems.push({
      videoId,
      title: snippet.title ?? '',
      publishedAt,
      thumbnail:
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url || '',
    })
  }

  if (plItems.length === 0) return []

  // 2. videos API로 statistics 조회 (최대 50개 배치)
  const ids = plItems.map((i) => i.videoId).join(',')
  const vUrl = buildYouTubeUrl('videos', {
    id: ids,
    part: 'statistics,snippet',
  }, apiKey)

  const vRes = await fetch(vUrl, { cache: 'no-store' })
  if (!vRes.ok) return []

  const vData = await vRes.json()

  const results: VideoItem[] = []
  for (const vItem of vData.items ?? []) {
    const stats = vItem.statistics ?? {}
    const views = parseInt(stats.viewCount ?? '0', 10)
    const likes = parseInt(stats.likeCount ?? '0', 10)
    const comments = parseInt(stats.commentCount ?? '0', 10)

    if (views < minViews || likes < minLikes || comments < minComments) continue

    const plMeta = plItems.find((p) => p.videoId === vItem.id)
    results.push({
      videoId: vItem.id,
      title: plMeta?.title ?? vItem.snippet?.title ?? '',
      channelName: vItem.snippet?.channelTitle ?? '',
      channelId,
      publishedAt: plMeta?.publishedAt ?? vItem.snippet?.publishedAt ?? '',
      thumbnailUrl: plMeta?.thumbnail || '',
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
    })
  }

  return results
}

// 활성 YouTube API 키 가져오기 (DB 키 → 환경변수 키 순서)
export async function getActiveApiKey(userId: number): Promise<string | null> {
  const { prisma } = await import('@/lib/prisma')

  const dbKeys = await prisma.apiKey.findMany({
    where: { userId, service: 'youtube', isActive: true, quotaExceeded: false },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { keyValue: true },
  })

  if (dbKeys.length > 0) return dbKeys[0].keyValue
  return process.env.YOUTUBE_API_KEY ?? null
}
