'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type ResourceFormState =
  | { success: true }
  | { errors: { title?: string[]; url?: string[]; category?: string[]; duplicate?: string[]; general?: string[] } }
  | undefined

export type CategoryFormState =
  | { success: true }
  | { errors: { name?: string[]; hasResources?: string[]; general?: string[] } }
  | undefined

// ─── 관련 링크 헬퍼 ─────────────────────────────────────

type RelatedLinkInput = { id?: number; title: string; url: string; memo: string | null }

function normalizeRelatedUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return null
  }
}

function parseRelatedLinks(formData: FormData): RelatedLinkInput[] {
  const raw = formData.get('relatedLinks') as string | null
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const result: RelatedLinkInput[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const url = normalizeRelatedUrl(String((item as { url?: string }).url ?? ''))
    if (!url) continue
    const title = String((item as { title?: string }).title ?? '').trim() || new URL(url).hostname
    const memoRaw = (item as { memo?: string | null }).memo
    const memo = memoRaw ? String(memoRaw).trim() || null : null
    const id = (item as { id?: number }).id
    result.push({ id: typeof id === 'number' ? id : undefined, title, url, memo })
  }
  return result
}

async function syncRelatedLinks(resourceId: number, links: RelatedLinkInput[]) {
  const existing = await prisma.resourceRelatedLink.findMany({ where: { resourceId } })
  const submittedIds = new Set(links.filter((l) => l.id).map((l) => l.id))

  const toDelete = existing.filter((e) => !submittedIds.has(e.id))
  if (toDelete.length > 0) {
    await prisma.resourceRelatedLink.deleteMany({ where: { id: { in: toDelete.map((e) => e.id) } } })
  }

  for (const link of links) {
    if (link.id) {
      await prisma.resourceRelatedLink.update({
        where: { id: link.id },
        data: { title: link.title, url: link.url, memo: link.memo },
      })
    } else {
      await prisma.resourceRelatedLink.create({
        data: { resourceId, title: link.title, url: link.url, memo: link.memo },
      })
    }
  }
}

// ─── 카테고리 액션 ─────────────────────────────────────

export async function createCategory(state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const session = await verifySession()
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string) || null
  const color = (formData.get('color') as string) || '#0EA5E9'
  const sortOrder = Number(formData.get('sortOrder') ?? 0)

  if (!name) return { errors: { name: ['카테고리명을 입력하세요.'] } }

  const existing = await prisma.resourceCategory.findUnique({ where: { userId_name: { userId: session.userId, name } } })
  if (existing) return { errors: { name: ['이미 존재하는 카테고리입니다.'] } }

  await prisma.resourceCategory.create({ data: { userId: session.userId, name, description, color, sortOrder } })
  revalidatePath('/resources')
  return { success: true }
}

export async function updateCategory(state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string) || null
  const color = (formData.get('color') as string) || '#0EA5E9'
  const sortOrder = Number(formData.get('sortOrder') ?? 0)

  if (!name) return { errors: { name: ['카테고리명을 입력하세요.'] } }

  const cat = await prisma.resourceCategory.findUnique({ where: { id } })
  if (!cat || cat.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }

  const dup = await prisma.resourceCategory.findFirst({ where: { userId: session.userId, name, NOT: { id } } })
  if (dup) return { errors: { name: ['이미 존재하는 카테고리입니다.'] } }

  await prisma.resourceCategory.update({ where: { id }, data: { name, description, color, sortOrder } })
  revalidatePath('/resources')
  return { success: true }
}

export async function deleteCategory(id: number) {
  const session = await verifySession()
  const cat = await prisma.resourceCategory.findUnique({ where: { id }, include: { _count: { select: { resources: true } } } })
  if (!cat || cat.userId !== session.userId) return { error: '권한이 없습니다.' }
  if (cat._count.resources > 0) return { error: `이 카테고리에 자료 ${cat._count.resources}개가 있습니다. 먼저 자료를 다른 카테고리로 이동하거나 삭제해주세요.` }
  await prisma.resourceCategory.delete({ where: { id } })
  revalidatePath('/resources')
  return { success: true }
}

// ─── 열람 기록 ─────────────────────────────────────────

export async function recordResourcesOpen(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const session = await verifySession()
  await prisma.resourceLink.updateMany({
    where: { id: { in: ids }, userId: session.userId },
    data: { lastOpenedAt: new Date(), openCount: { increment: 1 } },
  })
}

// ─── 자료 액션 ─────────────────────────────────────────

function extractFields(formData: FormData) {
  const tagsRaw = formData.get('tags') as string
  const ytApiFetchRaw = formData.get('ytApiFetchSuccess') as string
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    url: (formData.get('url') as string)?.trim() ?? '',
    memo: (formData.get('memo') as string) || null,
    platform: (formData.get('platform') as string) || null,
    customPlatform: (formData.get('customPlatform') as string) || null,
    resourceType: (formData.get('resourceType') as string) || null,
    customResourceType: (formData.get('customResourceType') as string) || null,
    status: (formData.get('status') as string) || '확인 전',
    priority: (formData.get('priority') as string) || '보통',
    isFavorite: formData.get('isFavorite') === 'true',
    tags: tagsRaw ? JSON.parse(tagsRaw) as string[] : [],
    thumbnailUrl: (formData.get('thumbnailUrl') as string) || null,
    thumbnailSource: (formData.get('thumbnailSource') as string) || null,
    ytVideoId: (formData.get('ytVideoId') as string) || null,
    ytOriginalTitle: (formData.get('ytOriginalTitle') as string) || null,
    ytChannelName: (formData.get('ytChannelName') as string) || null,
    ytChannelId: (formData.get('ytChannelId') as string) || null,
    ytPublishedAt: (formData.get('ytPublishedAt') as string) || null,
    ytDescription: (formData.get('ytDescription') as string) || null,
    ytDuration: (formData.get('ytDuration') as string) || null,
    ytViewCount: (formData.get('ytViewCount') as string) || null,
    ytLikeCount: (formData.get('ytLikeCount') as string) || null,
    ytCommentCount: (formData.get('ytCommentCount') as string) || null,
    ytPrivacyStatus: (formData.get('ytPrivacyStatus') as string) || null,
    ytApiLastFetched: (formData.get('ytApiLastFetched') as string) || null,
    ytApiFetchSuccess: ytApiFetchRaw === 'true' ? true : ytApiFetchRaw === 'false' ? false : null,
    ytApiError: (formData.get('ytApiError') as string) || null,
    registeredAt: (formData.get('registeredAt') as string) || null,
    sourcePublishedAt: (formData.get('sourcePublishedAt') as string) || null,
    categoryId: (formData.get('categoryId') as string) ? Number(formData.get('categoryId')) : null,
    projectId: (formData.get('projectId') as string) ? Number(formData.get('projectId')) : null,
    testId: (formData.get('testId') as string) ? Number(formData.get('testId')) : null,
    folderId: (formData.get('folderId') as string) ? Number(formData.get('folderId')) : null,
  }
}

export async function createResource(state: ResourceFormState, formData: FormData): Promise<ResourceFormState> {
  const session = await verifySession()
  const f = extractFields(formData)
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!f.url) return { errors: { url: ['링크 URL을 입력하세요.'] } }

  const existing = await prisma.resourceLink.findFirst({ where: { userId: session.userId, url: f.url } })
  if (existing) return { errors: { duplicate: [`이미 등록된 링크입니다.`] } }

  const relatedLinks = parseRelatedLinks(formData)

  try {
    const created = await prisma.resourceLink.create({
      data: {
        userId: session.userId,
        title: f.title,
        url: f.url,
        memo: f.memo,
        platform: f.platform,
        customPlatform: f.customPlatform,
        resourceType: f.resourceType,
        customResourceType: f.customResourceType,
        status: f.status,
        priority: f.priority,
        isFavorite: f.isFavorite,
        tags: f.tags.length > 0 ? f.tags : [],
        thumbnailUrl: f.thumbnailUrl,
        thumbnailSource: f.thumbnailSource,
        ytVideoId: f.ytVideoId,
        ytOriginalTitle: f.ytOriginalTitle,
        ytChannelName: f.ytChannelName,
        ytChannelId: f.ytChannelId,
        ytPublishedAt: f.ytPublishedAt ? new Date(f.ytPublishedAt) : null,
        ytDescription: f.ytDescription,
        ytDuration: f.ytDuration,
        ytViewCount: f.ytViewCount,
        ytLikeCount: f.ytLikeCount,
        ytCommentCount: f.ytCommentCount,
        ytPrivacyStatus: f.ytPrivacyStatus,
        ytApiLastFetched: f.ytApiLastFetched ? new Date(f.ytApiLastFetched) : null,
        ytApiFetchSuccess: f.ytApiFetchSuccess,
        ytApiError: f.ytApiError,
        registeredAt: f.registeredAt ? new Date(f.registeredAt) : new Date(),
        sourcePublishedAt: f.sourcePublishedAt ? new Date(f.sourcePublishedAt) : null,
        categoryId: f.categoryId,
        projectId: f.projectId,
        testId: f.testId,
        folderId: f.folderId,
      },
    })

    if (relatedLinks.length > 0) {
      await syncRelatedLinks(created.id, relatedLinks)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
    return { errors: { general: [msg] } }
  }

  revalidatePath('/resources')
  return { success: true }
}

export async function updateResource(state: ResourceFormState, formData: FormData): Promise<ResourceFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const resource = await prisma.resourceLink.findUnique({ where: { id } })
  if (!resource || resource.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!f.url) return { errors: { url: ['링크 URL을 입력하세요.'] } }

  const dup = await prisma.resourceLink.findFirst({ where: { userId: session.userId, url: f.url, NOT: { id } } })
  if (dup) return { errors: { duplicate: [`이미 등록된 링크입니다.`] } }

  const relatedLinks = parseRelatedLinks(formData)
  await syncRelatedLinks(id, relatedLinks)

  try {
    await prisma.resourceLink.update({
      where: { id },
      data: {
        title: f.title,
        url: f.url,
        memo: f.memo,
        platform: f.platform,
        customPlatform: f.customPlatform,
        resourceType: f.resourceType,
        customResourceType: f.customResourceType,
        status: f.status,
        priority: f.priority,
        isFavorite: f.isFavorite,
        tags: f.tags.length > 0 ? f.tags : [],
        thumbnailUrl: f.thumbnailUrl,
        thumbnailSource: f.thumbnailSource,
        ytVideoId: f.ytVideoId,
        ytOriginalTitle: f.ytOriginalTitle,
        ytChannelName: f.ytChannelName,
        ytChannelId: f.ytChannelId,
        ytPublishedAt: f.ytPublishedAt ? new Date(f.ytPublishedAt) : null,
        ytDescription: f.ytDescription,
        ytDuration: f.ytDuration,
        ytViewCount: f.ytViewCount,
        ytLikeCount: f.ytLikeCount,
        ytCommentCount: f.ytCommentCount,
        ytPrivacyStatus: f.ytPrivacyStatus,
        ytApiLastFetched: f.ytApiLastFetched ? new Date(f.ytApiLastFetched) : null,
        ytApiFetchSuccess: f.ytApiFetchSuccess,
        ytApiError: f.ytApiError,
        registeredAt: f.registeredAt ? new Date(f.registeredAt) : undefined,
        sourcePublishedAt: f.sourcePublishedAt ? new Date(f.sourcePublishedAt) : null,
        categoryId: f.categoryId,
        projectId: f.projectId,
        testId: f.testId,
        folderId: f.folderId,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.'
    return { errors: { general: [msg] } }
  }

  revalidatePath('/resources')
  return { success: true }
}

export async function deleteResource(id: number) {
  const session = await verifySession()
  const resource = await prisma.resourceLink.findUnique({ where: { id } })
  if (!resource || resource.userId !== session.userId) return
  await prisma.resourceLink.delete({ where: { id } })
  revalidatePath('/resources')
}

export async function toggleFavorite(id: number, current: boolean) {
  const session = await verifySession()
  const resource = await prisma.resourceLink.findUnique({ where: { id } })
  if (!resource || resource.userId !== session.userId) return
  await prisma.resourceLink.update({ where: { id }, data: { isFavorite: !current } })
  revalidatePath('/resources')
}

export type BulkResourceItem = {
  url: string
  title: string
  platform?: string | null
  resourceType?: string | null
  status: string
  priority: string
  categoryId?: number | null
  tags: string[]
  memo?: string | null
  thumbnailUrl?: string | null
  thumbnailSource?: string | null
  ytVideoId?: string | null
  ytOriginalTitle?: string | null
  ytChannelName?: string | null
  ytPublishedAt?: string | null
  ytDuration?: string | null
  ytViewCount?: string | null
  duplicateAction: 'skip' | 'update' | 'new'
  existingId?: number | null
}

export async function createResourcesBulk(
  items: BulkResourceItem[]
): Promise<{ created: number; updated: number; skipped: number }> {
  const session = await verifySession()
  let created = 0, updated = 0, skipped = 0

  for (const item of items) {
    if (item.duplicateAction === 'skip') { skipped++; continue }

    const data = {
      userId: session.userId,
      title: item.title || item.url,
      url: item.url,
      platform: item.platform || null,
      customPlatform: null,
      resourceType: item.resourceType || null,
      customResourceType: null,
      status: item.status,
      priority: item.priority,
      categoryId: item.categoryId || null,
      projectId: null,
      testId: null,
      isFavorite: false,
      tags: item.tags,
      memo: item.memo || null,
      thumbnailUrl: item.thumbnailUrl || null,
      thumbnailSource: item.thumbnailSource || null,
      ytVideoId: item.ytVideoId || null,
      ytOriginalTitle: item.ytOriginalTitle || null,
      ytChannelName: item.ytChannelName || null,
      ytChannelId: null,
      ytPublishedAt: item.ytPublishedAt ? new Date(item.ytPublishedAt) : null,
      ytDescription: null,
      ytDuration: item.ytDuration || null,
      ytViewCount: item.ytViewCount || null,
      ytLikeCount: null,
      ytCommentCount: null,
      ytPrivacyStatus: null,
      ytApiLastFetched: item.ytVideoId ? new Date() : null,
      ytApiFetchSuccess: item.ytVideoId ? true : null,
      ytApiError: null,
      registeredAt: new Date(),
      sourcePublishedAt: null,
    }

    if (item.duplicateAction === 'update' && item.existingId) {
      const existing = await prisma.resourceLink.findUnique({ where: { id: item.existingId } })
      if (existing && existing.userId === session.userId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId: _uid, ...updateData } = data
        await prisma.resourceLink.update({ where: { id: item.existingId }, data: updateData })
        updated++
      }
    } else {
      await prisma.resourceLink.create({ data })
      created++
    }
  }

  revalidatePath('/resources')
  return { created, updated, skipped }
}
