import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TestListClient from '@/components/tests/TestListClient'

export default async function TestsPage() {
  const session = await verifySession()

  const tests = await prisma.test.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      links: { orderBy: { createdAt: 'asc' } },
      snapshots: true,
    },
  })

  return (
    <TestListClient
      tests={tests.map((t) => ({
        ...t,
        startDate: t.startDate?.toISOString().split('T')[0] ?? null,
        endDate: t.endDate?.toISOString().split('T')[0] ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        snapshots: t.snapshots.map((s) => ({
          checkpoint: s.checkpoint,
          value: s.value,
          memo: s.memo,
        })),
        links: t.links.map((l) => ({
          id: l.id,
          label: l.label,
          url: l.url,
          memo: l.memo,
        })),
      }))}
    />
  )
}
