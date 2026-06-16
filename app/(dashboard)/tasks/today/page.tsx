import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TaskList from '@/components/tasks/TaskList'
import { moveTaskToToday } from '@/app/actions/tasks'

export default async function TodayTasksPage() {
  const session = await verifySession()

  // KST(UTC+9) 기준 오늘 날짜 계산
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayKST = nowKST.toISOString().split('T')[0]   // 'YYYY-MM-DD' (KST 기준)
  const today = new Date(todayKST + 'T00:00:00.000Z')   // UTC midnight of KST date
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const todayDow = nowKST.getUTCDay()  // 0=일, 1=월 ... 6=토

  const [tasks, overdueTasks, categories, projects, goals, routines, routineLogs] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.userId, taskDate: { gte: today, lt: tomorrow } },
      orderBy: [{ status: 'asc' }, { importance: 'asc' }, { urgency: 'asc' }, { sortOrder: 'asc' }],
    }),
    // 기한 지난 미완료 할 일 (오늘 이전, 완료 제외)
    prisma.task.findMany({
      where: {
        userId: session.userId,
        taskDate: { lt: today },
        status: { notIn: ['done', 'cancelled'] },
      },
      select: { id: true, title: true, taskDate: true, status: true },
      orderBy: { taskDate: 'desc' },
    }),
    prisma.category.findMany({ where: { userId: session.userId }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { userId: session.userId, status: { in: ['planning', 'active'] } }, orderBy: { title: 'asc' }, select: { id: true, title: true, color: true } }),
    prisma.goal.findMany({ where: { userId: session.userId, status: 'active' }, orderBy: { title: 'asc' }, select: { id: true, title: true, color: true } }),
    prisma.routine.findMany({
      where: { userId: session.userId, status: 'active' },
      select: { id: true, title: true, description: true, frequency: true, daysOfWeek: true, timeOfDay: true, color: true },
      orderBy: [{ timeOfDay: 'asc' }, { title: 'asc' }],
    }),
    prisma.routineLog.findMany({
      where: { userId: session.userId, logDate: today },
      select: { routineId: true, done: true },
    }),
  ])

  // 오늘 해당하는 루틴만 필터링
  const todayRoutines = routines.filter((r) => {
    if (r.frequency === 'daily') return true
    if (r.frequency === 'weekly') {
      const days = Array.isArray(r.daysOfWeek) ? (r.daysOfWeek as number[]) : []
      return days.includes(todayDow)
    }
    if (r.frequency === 'monthly') return true
    return false
  })

  const routineLogMap: Record<number, boolean> = {}
  routineLogs.forEach((log) => { routineLogMap[log.routineId] = log.done })

  const dateStr = new Date(todayKST).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'UTC',
  })

  const STATUS_KO: Record<string, string> = {
    pending: '대기', in_progress: '진행 중', on_hold: '보류',
  }

  return (
    <div className="p-8">
      {/* 기한 지난 미완료 할 일 */}
      {overdueTasks.length > 0 && (
        <div className="mb-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-orange-200 dark:border-orange-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold text-orange-700 dark:text-orange-400">기한 지난 미완료 할 일</span>
            <span className="text-xs px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-full font-bold">{overdueTasks.length}개</span>
          </div>
          <div>
            {overdueTasks.map((t, i) => {
              const dateLabel = new Date(t.taskDate).toLocaleDateString('ko-KR', {
                month: 'short', day: 'numeric', timeZone: 'UTC',
              })
              return (
                <div key={t.id} className={`flex items-center gap-3 px-5 py-3 ${i !== 0 ? 'border-t border-orange-100 dark:border-orange-800/50' : ''}`}>
                  <span className="text-[10px] text-orange-500 font-mono flex-shrink-0 w-12">{dateLabel}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold flex-shrink-0">
                    {STATUS_KO[t.status] ?? t.status}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">{t.title}</span>
                  <form action={async () => {
                    'use server'
                    await moveTaskToToday(t.id)
                  }}>
                    <button type="submit" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      오늘로 이동
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TaskList
        tasks={tasks}
        defaultDate={todayKST}
        title="오늘 할 일"
        description={dateStr}
        categories={categories}
        projects={projects}
        goals={goals}
        accent="blue"
        todayRoutines={todayRoutines.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          frequency: r.frequency,
          timeOfDay: r.timeOfDay,
          color: r.color,
          daysOfWeek: Array.isArray(r.daysOfWeek) ? (r.daysOfWeek as number[]) : null,
        }))}
        routineLogMap={routineLogMap}
        todayDateStr={todayKST}
      />
    </div>
  )
}
