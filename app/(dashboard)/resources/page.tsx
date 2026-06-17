import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import ResourceListClient from '@/components/resources/ResourceListClient'
import { getResourceFolders } from '@/app/actions/resourceFolders'

export default async function ResourcesPage() {
  const session = await verifySession()

  const [resources, categories, projects, tests, folders] = await Promise.all([
    prisma.resourceLink.findMany({
      where: { userId: session.userId },
      include: {
        category: true,
        relatedLinks: { orderBy: { createdAt: 'asc' } },
        resourceFolder: { select: { id: true, name: true } },
      },
      orderBy: { registeredAt: 'desc' },
    }),
    prisma.resourceCategory.findMany({
      where: { userId: session.userId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { resources: true } } },
    }),
    prisma.project.findMany({
      where: { userId: session.userId },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    prisma.test.findMany({
      where: { userId: session.userId },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    getResourceFolders(),
  ])

  return (
    <ResourceListClient
      resources={resources.map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        memo: r.memo,
        platform: r.platform,
        customPlatform: r.customPlatform,
        resourceType: r.resourceType,
        customResourceType: r.customResourceType,
        status: r.status,
        priority: r.priority,
        isFavorite: r.isFavorite,
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        thumbnailUrl: r.thumbnailUrl,
        thumbnailSource: r.thumbnailSource,
        ytVideoId: r.ytVideoId,
        ytOriginalTitle: r.ytOriginalTitle,
        ytChannelName: r.ytChannelName,
        ytChannelId: r.ytChannelId,
        ytPublishedAt: r.ytPublishedAt?.toISOString() ?? null,
        ytDescription: r.ytDescription,
        ytDuration: r.ytDuration,
        ytViewCount: r.ytViewCount,
        ytLikeCount: r.ytLikeCount,
        ytCommentCount: r.ytCommentCount,
        ytPrivacyStatus: r.ytPrivacyStatus,
        ytApiLastFetched: r.ytApiLastFetched?.toISOString() ?? null,
        ytApiFetchSuccess: r.ytApiFetchSuccess,
        ytApiError: r.ytApiError,
        registeredAt: r.registeredAt.toISOString().split('T')[0],
        sourcePublishedAt: r.sourcePublishedAt?.toISOString().split('T')[0] ?? null,
        categoryId: r.categoryId,
        categoryName: r.category?.name ?? null,
        categoryColor: r.category?.color ?? null,
        projectId: r.projectId,
        testId: r.testId,
        folderId: r.folderId,
        folderName: r.resourceFolder?.name ?? null,
        relatedLinks: r.relatedLinks.map((l) => ({ id: l.id, title: l.title, url: l.url, memo: l.memo })),
      }))}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        description: c.description,
        sortOrder: c.sortOrder,
        _count: c._count,
      }))}
      projects={projects}
      tests={tests}
      folders={folders}
    />
  )
}
