import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TestCompare from '@/components/tests/TestCompare'

export default async function CompareReportPage() {
  const session = await verifySession()

  const tests = await prisma.test.findMany({
    where: { userId: session.userId },
    include: { snapshots: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <TestCompare
      tests={tests.map((t) => ({
        id: t.id,
        title: t.title,
        platform: t.platform,
        customPlatform: t.customPlatform,
        testType: t.testType,
        customTestType: t.customTestType,
        targetName: t.targetName,
        startDate: t.startDate?.toISOString().split('T')[0] ?? null,
        endDate: t.endDate?.toISOString().split('T')[0] ?? null,
        primaryMetric: t.primaryMetric,
        customPrimaryMetric: t.customPrimaryMetric,
        metricDirection: t.metricDirection,
        status: t.status,
        resultStatus: t.resultStatus,
        resultSummary: t.resultSummary,
        analysisMemo: t.analysisMemo,
        snapshots: t.snapshots.map((s) => ({
          checkpoint: s.checkpoint,
          value: s.value,
          memo: s.memo,
        })),
      }))}
    />
  )
}
