import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import CalendarClient from '@/components/schedules/CalendarClient'

export default async function SchedulesPage() {
  const session = await verifySession()
  const userId = session.userId

  const [schedules, tasks, projects, routines, tests] = await Promise.all([
    prisma.schedule.findMany({
      where: { userId },
      include: { project: { select: { id: true, title: true } } },
      orderBy: [{ scheduleDate: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.task.findMany({
      where: { userId },
      select: {
        id: true, title: true, taskDate: true, status: true,
        importance: true, color: true, projectId: true, projectName: true,
      },
      orderBy: { taskDate: 'asc' },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, title: true, startDate: true, endDate: true, color: true, status: true },
      orderBy: { title: 'asc' },
    }),
    prisma.routine.findMany({
      where: { userId, status: 'active' },
      select: {
        id: true, title: true, frequency: true, daysOfWeek: true,
        timeOfDay: true, color: true, status: true, startDate: true, endDate: true,
      },
      orderBy: { title: 'asc' },
    }),
    prisma.test.findMany({
      where: { userId },
      select: { id: true, title: true, startDate: true, endDate: true, status: true },
      orderBy: { title: 'asc' },
    }),
  ])

  const s = (d: Date | null | undefined) => d ? d.toISOString().split('T')[0] : null

  return (
    <CalendarClient
      schedules={schedules.map((sc) => ({
        id: sc.id,
        title: sc.title,
        description: sc.description,
        scheduleDate: s(sc.scheduleDate)!,
        endDate: s(sc.endDate),
        startTime: sc.startTime,
        endTime: sc.endTime,
        isAllDay: sc.isAllDay,
        eventType: sc.eventType,
        status: sc.status,
        priority: sc.priority,
        color: sc.color,
        completedAt: sc.completedAt ? sc.completedAt.toISOString() : null,
        notification: sc.notification,
        projectId: sc.projectId,
        projectTitle: sc.project?.title ?? null,
      }))}
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        taskDate: s(t.taskDate)!,
        status: t.status,
        importance: t.importance,
        color: t.color,
        projectId: t.projectId,
        projectName: t.projectName,
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.title,
        startDate: s(p.startDate),
        endDate: s(p.endDate),
        color: p.color,
        status: p.status,
      }))}
      routines={routines.map((r) => ({
        id: r.id,
        title: r.title,
        frequency: r.frequency,
        daysOfWeek: Array.isArray(r.daysOfWeek) ? (r.daysOfWeek as number[]) : null,
        timeOfDay: r.timeOfDay,
        color: r.color,
        status: r.status,
        startDate: s(r.startDate),
        endDate: s(r.endDate),
      }))}
      tests={tests.map((t) => ({
        id: t.id,
        title: t.title,
        startDate: s(t.startDate),
        endDate: s(t.endDate),
        status: t.status,
      }))}
    />
  )
}
