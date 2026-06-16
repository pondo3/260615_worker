'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type IdeaFormState =
  | { success: true }
  | { errors: { title?: string[]; general?: string[] } }
  | undefined

export type IdeaCategoryFormState =
  | { success: true }
  | { errors: { name?: string[]; general?: string[] } }
  | undefined

const DEFAULT_IDEA_CATEGORIES: { name: string; color: string }[] = [
  { name: '사이트 개선', color: '#0EA5E9' },
  { name: '기능 개발', color: '#6366F1' },
  { name: '유튜브 콘텐츠', color: '#EF4444' },
  { name: '블로그 콘텐츠', color: '#F97316' },
  { name: '디자인', color: '#EC4899' },
  { name: '마케팅', color: '#EAB308' },
  { name: '자동화', color: '#22C55E' },
  { name: '업무 효율', color: '#14B8A6' },
  { name: '고객 관리', color: '#8B5CF6' },
  { name: '수익화', color: '#10B981' },
  { name: '개인 할 일', color: '#64748B' },
  { name: '기타', color: '#6B7280' },
]

export async function ensureDefaultIdeaCategories(userId: number) {
  const count = await prisma.ideaCategory.count({ where: { userId } })
  if (count > 0) return
  await prisma.ideaCategory.createMany({
    data: DEFAULT_IDEA_CATEGORIES.map((c, i) => ({ userId, name: c.name, color: c.color, sortOrder: i })),
  })
}

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

async function syncIdeaRelatedLinks(ideaId: number, links: RelatedLinkInput[]) {
  const existing = await prisma.ideaRelatedLink.findMany({ where: { ideaId } })
  const submittedIds = new Set(links.filter((l) => l.id).map((l) => l.id))

  const toDelete = existing.filter((e) => !submittedIds.has(e.id))
  if (toDelete.length > 0) {
    await prisma.ideaRelatedLink.deleteMany({ where: { id: { in: toDelete.map((e) => e.id) } } })
  }

  for (const link of links) {
    if (link.id) {
      await prisma.ideaRelatedLink.update({
        where: { id: link.id },
        data: { title: link.title, url: link.url, memo: link.memo },
      })
    } else {
      await prisma.ideaRelatedLink.create({
        data: { ideaId, title: link.title, url: link.url, memo: link.memo },
      })
    }
  }
}

// ─── 카테고리 액션 ─────────────────────────────────────

export async function createIdeaCategory(state: IdeaCategoryFormState, formData: FormData): Promise<IdeaCategoryFormState> {
  const session = await verifySession()
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#0EA5E9'
  const sortOrder = Number(formData.get('sortOrder') ?? 0)

  if (!name) return { errors: { name: ['카테고리명을 입력하세요.'] } }

  const existing = await prisma.ideaCategory.findUnique({ where: { userId_name: { userId: session.userId, name } } })
  if (existing) return { errors: { name: ['이미 존재하는 카테고리입니다.'] } }

  await prisma.ideaCategory.create({ data: { userId: session.userId, name, color, sortOrder } })
  revalidatePath('/ideas')
  return { success: true }
}

export async function updateIdeaCategory(state: IdeaCategoryFormState, formData: FormData): Promise<IdeaCategoryFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#0EA5E9'
  const sortOrder = Number(formData.get('sortOrder') ?? 0)

  if (!name) return { errors: { name: ['카테고리명을 입력하세요.'] } }

  const cat = await prisma.ideaCategory.findUnique({ where: { id } })
  if (!cat || cat.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }

  const dup = await prisma.ideaCategory.findFirst({ where: { userId: session.userId, name, NOT: { id } } })
  if (dup) return { errors: { name: ['이미 존재하는 카테고리입니다.'] } }

  await prisma.ideaCategory.update({ where: { id }, data: { name, color, sortOrder } })
  revalidatePath('/ideas')
  return { success: true }
}

export async function deleteIdeaCategory(id: number) {
  const session = await verifySession()
  const cat = await prisma.ideaCategory.findUnique({ where: { id }, include: { _count: { select: { ideas: true } } } })
  if (!cat || cat.userId !== session.userId) return { error: '권한이 없습니다.' }
  if (cat._count.ideas > 0) return { error: `이 카테고리에 아이디어 ${cat._count.ideas}개가 있습니다. 먼저 다른 카테고리로 이동하거나 삭제해주세요.` }
  await prisma.ideaCategory.delete({ where: { id } })
  revalidatePath('/ideas')
  return { success: true }
}

// ─── 아이디어 액션 ─────────────────────────────────────

function extractIdeaFields(formData: FormData) {
  const tagsRaw = formData.get('tags') as string
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    content: (formData.get('content') as string) || null,
    memo: (formData.get('memo') as string) || null,
    categoryId: formData.get('categoryId') ? Number(formData.get('categoryId')) : null,
    projectId: formData.get('projectId') ? Number(formData.get('projectId')) : null,
    resourceId: formData.get('resourceId') ? Number(formData.get('resourceId')) : null,
    status: (formData.get('status') as string) || '미정',
    importance: (formData.get('importance') as string) || '보통',
    difficulty: (formData.get('difficulty') as string) || '보통',
    expectedEffect: (formData.get('expectedEffect') as string) || '보통',
    tags: tagsRaw ? (JSON.parse(tagsRaw) as string[]) : [],
    dueDate: (formData.get('dueDate') as string) || null,
  }
}

export async function createIdea(state: IdeaFormState, formData: FormData): Promise<IdeaFormState> {
  const session = await verifySession()
  const f = extractIdeaFields(formData)
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  const relatedLinks = parseRelatedLinks(formData)

  const created = await prisma.idea.create({
    data: {
      userId: session.userId,
      title: f.title,
      content: f.content,
      memo: f.memo,
      categoryId: f.categoryId,
      projectId: f.projectId,
      resourceId: f.resourceId,
      status: f.status,
      importance: f.importance,
      difficulty: f.difficulty,
      expectedEffect: f.expectedEffect,
      tags: f.tags.length > 0 ? f.tags : [],
      dueDate: f.dueDate ? new Date(f.dueDate) : null,
    },
  })

  if (relatedLinks.length > 0) {
    await syncIdeaRelatedLinks(created.id, relatedLinks)
  }

  revalidatePath('/ideas')
  return { success: true }
}

export async function updateIdea(state: IdeaFormState, formData: FormData): Promise<IdeaFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractIdeaFields(formData)

  const idea = await prisma.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  const relatedLinks = parseRelatedLinks(formData)
  await syncIdeaRelatedLinks(id, relatedLinks)

  await prisma.idea.update({
    where: { id },
    data: {
      title: f.title,
      content: f.content,
      memo: f.memo,
      categoryId: f.categoryId,
      projectId: f.projectId,
      resourceId: f.resourceId,
      status: f.status,
      importance: f.importance,
      difficulty: f.difficulty,
      expectedEffect: f.expectedEffect,
      tags: f.tags.length > 0 ? f.tags : [],
      dueDate: f.dueDate ? new Date(f.dueDate) : null,
    },
  })

  revalidatePath('/ideas')
  return { success: true }
}

export async function deleteIdea(id: number) {
  const session = await verifySession()
  const idea = await prisma.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== session.userId) return
  await prisma.idea.delete({ where: { id } })
  revalidatePath('/ideas')
}

export async function quickAddIdea(title: string) {
  const session = await verifySession()
  const trimmed = title.trim()
  if (!trimmed) return
  await prisma.idea.create({
    data: { userId: session.userId, title: trimmed, status: '미정' },
  })
  revalidatePath('/ideas')
}

export async function updateIdeaStatus(id: number, status: string) {
  const session = await verifySession()
  const idea = await prisma.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== session.userId) return
  await prisma.idea.update({ where: { id }, data: { status } })
  revalidatePath('/ideas')
}

export async function toggleIdeaFavorite(id: number, current: boolean) {
  const session = await verifySession()
  const idea = await prisma.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== session.userId) return
  await prisma.idea.update({ where: { id }, data: { isFavorite: !current } })
  revalidatePath('/ideas')
}

// ─── 전환 액션 ─────────────────────────────────────────

function stripHtml(html: string | null): string | null {
  if (!html) return null
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null
}

const IMPORTANCE_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  '매우 중요': 'high',
  '높음': 'high',
  '보통': 'medium',
  '낮음': 'low',
}

export async function convertIdeaToTask(id: number) {
  const session = await verifySession()
  const idea = await prisma.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== session.userId) return { error: '권한이 없습니다.' }

  const task = await prisma.task.create({
    data: {
      userId: session.userId,
      title: idea.title,
      description: idea.content ?? stripHtml(idea.memo),
      taskDate: idea.dueDate ?? new Date(),
      importance: IMPORTANCE_MAP[idea.importance] ?? 'medium',
      status: 'pending',
      projectId: idea.projectId,
    },
  })

  await prisma.idea.update({ where: { id }, data: { status: '진행 중' } })

  revalidatePath('/ideas')
  revalidatePath('/tasks')
  revalidatePath('/tasks/today')
  return { success: true, taskId: task.id }
}

export async function convertIdeaToProject(id: number) {
  const session = await verifySession()
  const idea = await prisma.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== session.userId) return { error: '권한이 없습니다.' }

  const project = await prisma.project.create({
    data: {
      userId: session.userId,
      title: idea.title,
      description: idea.content ?? stripHtml(idea.memo),
      status: 'planning',
      startDate: idea.dueDate,
    },
  })

  await prisma.idea.update({ where: { id }, data: { status: '진행 중', projectId: project.id } })

  revalidatePath('/ideas')
  revalidatePath('/projects')
  return { success: true, projectId: project.id }
}
