import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import LauncherClient from '@/components/launcher/LauncherClient'

export default async function LauncherPage() {
  const session = await verifySession()

  const groups = await prisma.launcherGroup.findMany({
    where: { userId: session.userId },
    include: {
      links: { orderBy: { sortOrder: 'asc' } },
      folders: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }],
  })

  return (
    <div className="p-8">
      <LauncherClient
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          color: g.color,
          description: g.description,
          isPinned: g.isPinned,
          sortOrder: g.sortOrder,
          links: g.links.map((l) => ({
            id: l.id,
            name: l.name,
            url: l.url,
            description: l.description,
            tags: l.tags as string[],
            isActive: l.isActive,
            openNewTab: l.openNewTab,
            isFavorite: l.isFavorite,
            launchCount: l.launchCount,
            lastLaunchedAt: l.lastLaunchedAt ? l.lastLaunchedAt.toISOString() : null,
            sortOrder: l.sortOrder,
          })),
          folders: g.folders.map((f) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            description: f.description,
            isActive: f.isActive,
            sortOrder: f.sortOrder,
          })),
        }))}
      />
    </div>
  )
}
