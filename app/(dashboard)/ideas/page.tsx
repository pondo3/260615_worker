import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { ensureDefaultIdeaCategories } from '@/app/actions/ideas'
import IdeaListClient from '@/components/ideas/IdeaListClient'

export default async function IdeasPage() {
  const session = await verifySession()
  await ensureDefaultIdeaCategories(session.userId)

  const [ideas, categories, projects, resources] = await Promise.all([
    prisma.idea.findMany({
      where: { userId: session.userId },
      include: { category: true, relatedLinks: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ideaCategory.findMany({
      where: { userId: session.userId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { ideas: true } } },
    }),
    prisma.project.findMany({
      where: { userId: session.userId },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    prisma.resourceLink.findMany({
      where: { userId: session.userId },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
  ])

  return (
    <IdeaListClient
      ideas={ideas.map((i) => ({
        id: i.id,
        title: i.title,
        content: i.content,
        memo: i.memo,
        categoryId: i.categoryId,
        categoryName: i.category?.name ?? null,
        categoryColor: i.category?.color ?? null,
        projectId: i.projectId,
        resourceId: i.resourceId,
        status: i.status,
        importance: i.importance,
        difficulty: i.difficulty,
        expectedEffect: i.expectedEffect,
        tags: Array.isArray(i.tags) ? (i.tags as string[]) : [],
        isFavorite: i.isFavorite,
        dueDate: i.dueDate?.toISOString().split('T')[0] ?? null,
        createdAt: i.createdAt.toISOString().split('T')[0],
        updatedAt: i.updatedAt.toISOString().split('T')[0],
        relatedLinks: i.relatedLinks.map((l) => ({ id: l.id, title: l.title, url: l.url, memo: l.memo })),
      }))}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        sortOrder: c.sortOrder,
        _count: c._count,
      }))}
      projects={projects}
      resources={resources}
    />
  )
}
