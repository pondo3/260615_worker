'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

// ─── 채널 (기존 유지) ─────────────────────────────────────────────────────────

export async function getChannels() {
  const session = await verifySession()
  return prisma.channel.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function addChannel(channelId: string, channelName: string, thumbnailUrl: string) {
  const session = await verifySession()
  await prisma.channel.upsert({
    where: { userId_channelId: { userId: session.userId, channelId } },
    create: { userId: session.userId, channelId, channelName, thumbnailUrl },
    update: { channelName, thumbnailUrl, isActive: true },
  })
  revalidatePath('/materials')
}

export async function toggleChannel(id: number, isActive: boolean) {
  const session = await verifySession()
  const channel = await prisma.channel.findFirst({ where: { id, userId: session.userId } })
  if (!channel) return
  await prisma.channel.update({ where: { id }, data: { isActive } })
  revalidatePath('/materials')
}

export async function deleteChannel(id: number) {
  const session = await verifySession()
  await prisma.channel.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/materials')
}

// ─── 수집 룰 (기존 유지) ──────────────────────────────────────────────────────

export async function getCollectionRules() {
  const session = await verifySession()
  return prisma.collectionRule.findMany({
    where: { userId: session.userId },
    include: { channel: { select: { channelName: true, channelId: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function saveCollectionRules(
  channelDbIds: number[],
  minViews: number,
  maxDaysOld: number,
  minLikes: number,
  minComments: number,
  scheduleHour: number | null,
) {
  const session = await verifySession()
  const ownedChannels = await prisma.channel.findMany({
    where: { id: { in: channelDbIds }, userId: session.userId },
    select: { id: true },
  })
  const validIds = ownedChannels.map((c) => c.id)
  await prisma.collectionRule.createMany({
    data: validIds.map((channelDbId) => ({
      channelDbId, userId: session.userId,
      minViews, maxDaysOld, minLikes, minComments, scheduleHour,
    })),
  })
  revalidatePath('/materials')
}

export async function deleteCollectionRule(id: number) {
  const session = await verifySession()
  await prisma.collectionRule.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/materials')
}

// ─── URL 메타데이터 수집 ──────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/shorts\/([^?#]+)/,
    /youtube\.com\/embed\/([^?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function detectPlatform(url: string): string {
  if (/youtu(\.be|be\.com)/.test(url)) return 'youtube'
  if (/tiktok\.com/.test(url)) return 'tiktok'
  if (/instagram\.com/.test(url)) return 'instagram'
  if (/twitter\.com|x\.com/.test(url)) return 'twitter'
  if (/facebook\.com/.test(url)) return 'facebook'
  if (/naver\.com|blog\.naver/.test(url)) return 'naver'
  return 'website'
}

function isEnglishTitle(text: string): boolean {
  // 한글이 하나라도 있으면 이미 한국어(혼용) 제목 → 번역 불필요
  if (/[ㄱ-힣]/.test(text)) return false
  // 영문자가 2글자 이상이면 영어 제목으로 판단
  const englishCount = (text.match(/[a-zA-Z]/g) ?? []).length
  return englishCount >= 2
}

export async function fetchUrlMetadata(url: string): Promise<{
  platform: string
  videoId: string | null
  originalTitle: string | null
  channelName: string | null
  channelId: string | null
  thumbnailUrl: string | null
  uploadedAt: string | null
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
}> {
  const platform = detectPlatform(url)
  const result = {
    platform,
    videoId: null as string | null,
    originalTitle: null as string | null,
    channelName: null as string | null,
    channelId: null as string | null,
    thumbnailUrl: null as string | null,
    uploadedAt: null as string | null,
    viewCount: null as number | null,
    likeCount: null as number | null,
    commentCount: null as number | null,
  }

  try {
    if (platform === 'youtube') {
      const videoId = extractYouTubeId(url)
      result.videoId = videoId
      if (videoId) {
        result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { next: { revalidate: 0 } }
      )
      if (oembedRes.ok) {
        const data = await oembedRes.json()
        result.originalTitle = data.title || null
        result.channelName = data.author_name || null
      }
      return result
    }

    if (platform === 'tiktok') {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { next: { revalidate: 0 } }
      )
      if (oembedRes.ok) {
        const data = await oembedRes.json()
        result.originalTitle = data.title || null
        result.channelName = data.author_name || null
        result.thumbnailUrl = data.thumbnail_url || null
      }
      return result
    }

    // General OG tag fetch
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
      next: { revalidate: 0 },
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const getOG = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
          ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))
        return m?.[1]?.trim() || null
      }
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      result.originalTitle = getOG('title') || titleMatch?.[1]?.trim() || null
      result.thumbnailUrl = getOG('image') || null
      result.channelName = getOG('site_name') || null
    }
  } catch {
    // ignore fetch errors
  }

  return result
}

// ─── 번역 ────────────────────────────────────────────────────────────────────

export async function translateToKorean(text: string): Promise<string | null> {
  if (!isEnglishTitle(text)) return null
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text)}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    // Response: [[["번역","원본",...], ...], ...]
    const translated: string = data?.[0]?.map((item: [string]) => item[0]).join('') ?? ''
    if (!translated || translated === text) return null
    return translated
  } catch {
    return null
  }
}

// ─── 소재 CRUD ────────────────────────────────────────────────────────────────

export async function getMaterials(filters?: {
  platform?: string
  usageStatus?: string
  status?: string
  search?: string
  category?: string
}) {
  const session = await verifySession()
  return prisma.material.findMany({
    where: {
      userId: session.userId,
      ...(filters?.platform && filters.platform !== 'all' ? { platform: filters.platform } : {}),
      ...(filters?.usageStatus && filters.usageStatus !== 'all' ? { usageStatus: filters.usageStatus } : {}),
      ...(filters?.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.search ? {
        OR: [
          { originalTitle: { contains: filters.search, mode: 'insensitive' } },
          { translatedTitle: { contains: filters.search, mode: 'insensitive' } },
          { channelName: { contains: filters.search, mode: 'insensitive' } },
          { memo: { contains: filters.search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { collectedAt: 'desc' },
  })
}

export async function checkDuplicate(url: string) {
  const session = await verifySession()
  const existing = await prisma.material.findFirst({
    where: { userId: session.userId, url },
  })
  return existing ? { isDuplicate: true, id: existing.id, title: existing.originalTitle } : { isDuplicate: false }
}

export async function registerMaterial(data: {
  url: string
  platform: string
  videoId?: string | null
  originalTitle?: string | null
  translatedTitle?: string | null
  isTranslated?: boolean
  channelName?: string | null
  channelId?: string | null
  thumbnailUrl?: string | null
  viewCount?: number | null
  likeCount?: number | null
  commentCount?: number | null
  uploadedAt?: string | null
  category?: string | null
  tags?: string[]
  memo?: string | null
  scriptIdea?: string | null
  importance?: string
  status?: string
  usageStatus?: string
  plannedUseAt?: string | null
  projectId?: number | null
}) {
  const session = await verifySession()

  const mat = await prisma.material.create({
    data: {
      userId: session.userId,
      url: data.url,
      platform: data.platform,
      videoId: data.videoId ?? null,
      originalTitle: data.originalTitle ?? null,
      translatedTitle: data.translatedTitle ?? null,
      isTranslated: data.isTranslated ?? false,
      channelName: data.channelName ?? null,
      channelId: data.channelId ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      viewCount: data.viewCount ?? null,
      likeCount: data.likeCount ?? null,
      commentCount: data.commentCount ?? null,
      uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : null,
      category: data.category ?? null,
      tags: data.tags ?? [],
      memo: data.memo ?? null,
      scriptIdea: data.scriptIdea ?? null,
      importance: data.importance ?? '보통',
      status: data.status ?? '수집됨',
      usageStatus: data.usageStatus ?? '미사용',
      plannedUseAt: data.plannedUseAt ? new Date(data.plannedUseAt) : null,
      projectId: data.projectId ?? null,
    },
  })
  revalidatePath('/materials')
  return mat
}

export async function updateMaterial(id: number, data: {
  originalTitle?: string | null
  translatedTitle?: string | null
  translationEdited?: boolean
  channelName?: string | null
  thumbnailUrl?: string | null
  viewCount?: number | null
  likeCount?: number | null
  commentCount?: number | null
  uploadedAt?: string | null
  category?: string | null
  tags?: string[]
  memo?: string | null
  scriptIdea?: string | null
  importance?: string
  status?: string
  usageStatus?: string
  plannedUseAt?: string | null
  actualUsedAt?: string | null
  projectId?: number | null
}) {
  const session = await verifySession()
  const mat = await prisma.material.findFirst({ where: { id, userId: session.userId } })
  if (!mat) throw new Error('권한 없음')

  await prisma.material.update({
    where: { id },
    data: {
      ...( data.originalTitle !== undefined ? { originalTitle: data.originalTitle } : {}),
      ...( data.translatedTitle !== undefined ? { translatedTitle: data.translatedTitle } : {}),
      ...( data.translationEdited !== undefined ? { translationEdited: data.translationEdited } : {}),
      ...( data.channelName !== undefined ? { channelName: data.channelName } : {}),
      ...( data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl } : {}),
      ...( data.viewCount !== undefined ? { viewCount: data.viewCount } : {}),
      ...( data.likeCount !== undefined ? { likeCount: data.likeCount } : {}),
      ...( data.commentCount !== undefined ? { commentCount: data.commentCount } : {}),
      ...( data.uploadedAt !== undefined ? { uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : null } : {}),
      ...( data.category !== undefined ? { category: data.category } : {}),
      ...( data.tags !== undefined ? { tags: data.tags } : {}),
      ...( data.memo !== undefined ? { memo: data.memo } : {}),
      ...( data.scriptIdea !== undefined ? { scriptIdea: data.scriptIdea } : {}),
      ...( data.importance !== undefined ? { importance: data.importance } : {}),
      ...( data.status !== undefined ? { status: data.status } : {}),
      ...( data.usageStatus !== undefined ? { usageStatus: data.usageStatus } : {}),
      ...( data.plannedUseAt !== undefined ? { plannedUseAt: data.plannedUseAt ? new Date(data.plannedUseAt) : null } : {}),
      ...( data.actualUsedAt !== undefined ? { actualUsedAt: data.actualUsedAt ? new Date(data.actualUsedAt) : null } : {}),
      ...( data.projectId !== undefined ? { projectId: data.projectId } : {}),
    },
  })
  revalidatePath('/materials')
}

export async function deleteMaterial(id: number) {
  const session = await verifySession()
  await prisma.material.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/materials')
}

export async function bulkDeleteMaterials(ids: number[]) {
  const session = await verifySession()
  await prisma.material.deleteMany({ where: { id: { in: ids }, userId: session.userId } })
  revalidatePath('/materials')
}

export async function quickUpdateStatus(id: number, status: string) {
  const session = await verifySession()
  await prisma.material.updateMany({ where: { id, userId: session.userId }, data: { status } })
  revalidatePath('/materials')
}

export async function quickUpdateUsage(id: number, usageStatus: string) {
  const session = await verifySession()
  const now = usageStatus === '사용 완료' ? new Date() : undefined
  await prisma.material.updateMany({
    where: { id, userId: session.userId },
    data: { usageStatus, ...(now ? { actualUsedAt: now } : {}) },
  })
  revalidatePath('/materials')
}

// legacy
export async function setMaterialUsed(id: number, isUsed: boolean) {
  const session = await verifySession()
  await prisma.material.updateMany({
    where: { id, userId: session.userId },
    data: { isUsed, usedAt: isUsed ? new Date() : null },
  })
  revalidatePath('/materials')
}
