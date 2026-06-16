import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import ProjectListClient from '@/components/projects/ProjectListClient'

export default async function ProjectsPage() {
  const session = await verifySession()

  const projects = await prisma.project.findMany({
    where: { userId: session.userId },
    orderBy: [{ status: 'asc' }, { endDate: 'asc' }, { createdAt: 'desc' }],
  })

  // 프로젝트별 할 일 현황 계산 (projectName 매칭)
  const projectTitles = projects.map((p) => p.title).filter(Boolean)
  const linkedTasks =
    projectTitles.length > 0
      ? await prisma.task.findMany({
          where: {
            userId: session.userId,
            projectName: { in: projectTitles, mode: 'insensitive' },
          },
          select: { projectName: true, status: true },
        })
      : []

  // title(소문자) → { total, done, inProgress, pending }
  const progressMap: Record<string, { total: number; done: number; inProgress: number; pending: number }> = {}
  for (const t of linkedTasks) {
    const key = (t.projectName ?? '').toLowerCase()
    if (!progressMap[key]) progressMap[key] = { total: 0, done: 0, inProgress: 0, pending: 0 }
    progressMap[key].total++
    if (t.status === 'done') progressMap[key].done++
    else if (t.status === 'in_progress') progressMap[key].inProgress++
    else progressMap[key].pending++
  }

  return (
    <ProjectListClient
      projects={projects.map((p) => ({
        ...p,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
      progressMap={progressMap}
    />
  )
}
