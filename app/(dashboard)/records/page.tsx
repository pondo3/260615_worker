import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import RecordListClient from '@/components/records/RecordListClient'

export default async function RecordsPage() {
  const session = await verifySession()

  const records = await prisma.record.findMany({
    where: { userId: session.userId },
    include: {
      videoLinks: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { date: 'desc' },
  })

  return (
    <RecordListClient
      records={records.map((r) => ({
        id: r.id,
        title: r.title,
        date: r.date.toISOString().split('T')[0],
        type: r.type,
        content: r.content,
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        videoLinks: r.videoLinks.map((v) => ({
          id: v.id,
          url: v.url,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          channelName: v.channelName,
          duration: v.duration,
          memo: v.memo,
          sortOrder: v.sortOrder,
        })),
      }))}
    />
  )
}
