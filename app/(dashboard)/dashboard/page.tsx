import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import QuickCompleteBtn from '@/components/dashboard/QuickCompleteBtn'

/* ─── 헬퍼 컴포넌트 ─── */

function StatCard({
  label, value, sub, icon, color, href, alert,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
  href?: string
  alert?: boolean
}) {
  const inner = (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 flex items-center gap-3 transition-shadow ${
      alert
        ? 'border-red-200 dark:border-red-900/50'
        : 'border-gray-200 dark:border-gray-700'
    } ${href ? 'hover:shadow-md cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
        <p className={`text-2xl font-black leading-none mt-0.5 ${alert ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function RingMini({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5}
          className="text-gray-100 dark:text-gray-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

function WeekBarImproved({ days }: {
  days: { label: string; done: number; total: number; isToday: boolean }[]
}) {
  const max = Math.max(...days.map((d) => d.total), 1)
  return (
    <div className="flex items-end gap-1.5 h-24">
      {days.map((d) => {
        const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0
        const barH = Math.max((d.total / max) * 100, 6)
        const doneH = d.total > 0 ? Math.max((d.done / d.total) * barH, d.done > 0 ? 4 : 0) : 0
        return (
          <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
            {d.total > 0 && (
              <span className="text-[9px] text-gray-400 font-medium">{pct}%</span>
            )}
            <div className="w-full relative flex flex-col justify-end" style={{ height: 64 }}>
              <div
                className={`w-full rounded-t-lg absolute bottom-0 ${
                  d.isToday ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
                }`}
                style={{ height: `${barH}%` }}
              />
              {doneH > 0 && (
                <div
                  className={`w-full rounded-t-lg absolute bottom-0 transition-all duration-500 ${
                    d.isToday ? 'bg-blue-500' : 'bg-emerald-400 dark:bg-emerald-500'
                  }`}
                  style={{ height: `${doneH}%` }}
                />
              )}
            </div>
            <span className={`text-[10px] font-semibold ${
              d.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{d.label}</span>
            {d.total > 0 && (
              <span className="text-[9px] text-gray-300 dark:text-gray-600">{d.done}/{d.total}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PriorityRank({ rank }: { rank: 1 | 2 | 3 }) {
  const cfg = {
    1: { label: '1순위', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    2: { label: '2순위', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    3: { label: '3순위', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  }[rank]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

/* ─── 메인 페이지 ─── */
export default async function DashboardPage() {
  const session = await verifySession()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  // 오늘 루틴 로그용 날짜
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const [todayTasks, overdueTasks, weekTasks, activeProjectCount, activeRoutines, todayRoutineLogs, activeGoals, activeTests, activeProcesses, todayTimeBlocks] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.userId, taskDate: { gte: today, lt: tomorrow } },
      orderBy: [{ importance: 'asc' }, { urgency: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.task.findMany({
      where: { userId: session.userId, taskDate: { lt: today }, status: { notIn: ['done', 'cancelled'] } },
      orderBy: { taskDate: 'desc' },
      take: 5,
    }),
    prisma.task.findMany({
      where: { userId: session.userId, taskDate: { gte: weekStart, lt: tomorrow } },
    }),
    prisma.project.count({ where: { userId: session.userId, status: { in: ['planning', 'active'] } } }),
    prisma.routine.findMany({
      where: { userId: session.userId, status: 'active', frequency: 'daily' },
      select: { id: true, title: true, color: true },
    }),
    prisma.routineLog.findMany({
      where: { userId: session.userId, logDate: { gte: today, lte: todayEnd }, done: true },
      select: { routineId: true },
    }),
    prisma.goal.findMany({
      where: { userId: session.userId, status: 'active' },
      select: { id: true, title: true, color: true, progress: true, endDate: true },
      orderBy: { endDate: 'asc' },
      take: 4,
    }),
    prisma.test.findMany({
      where: { userId: session.userId, status: { in: ['planning', 'in_progress', 'recording'] } },
      select: { id: true, title: true, status: true, platform: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.process.findMany({
      where: { userId: session.userId, status: 'active' },
      include: { steps: { select: { status: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    }),
    prisma.timeBlock.findMany({
      where: { userId: session.userId, date: { gte: today, lt: tomorrow } },
      select: { id: true, title: true, startTime: true, endTime: true, status: true, color: true, blockType: true },
      orderBy: { startTime: 'asc' },
    }),
  ])

  const doneTodayCount = todayTasks.filter((t) => t.status === 'done').length
  const pendingTodayCount = todayTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length
  const weekDone = weekTasks.filter((t) => t.status === 'done').length
  const weekPct = weekTasks.length > 0 ? Math.round((weekDone / weekTasks.length) * 100) : 0

  // 시간 블록 통계
  const tbPlannedMin = todayTimeBlocks.reduce((s, b) => {
    const [sh, sm] = b.startTime.split(':').map(Number)
    const [eh, em] = b.endTime.split(':').map(Number)
    return s + Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  }, 0)
  const tbDoneMin = todayTimeBlocks.filter((b) => b.status === 'done').reduce((s, b) => {
    const [sh, sm] = b.startTime.split(':').map(Number)
    const [eh, em] = b.endTime.split(':').map(Number)
    return s + Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  }, 0)
  const nowStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  const nextBlock = todayTimeBlocks.find((b) => b.startTime > nowStr && b.status !== 'done') ?? null
  function fmtMin(m: number) {
    if (m <= 0) return '0분'
    const h = Math.floor(m / 60)
    const min = m % 60
    return h > 0 ? (min > 0 ? `${h}h ${min}m` : `${h}h`) : `${min}m`
  }
  const todayPct = todayTasks.length > 0 ? Math.round((doneTodayCount / todayTasks.length) * 100) : 0

  // 우선순위 정렬: 1) 긴급+중요, 2) 중요, 3) 긴급, 4) 일반
  const priorityScore = (t: typeof todayTasks[0]) => {
    if (t.importance === 'high' && t.urgency === 'high') return 0
    if (t.importance === 'high') return 1
    if (t.urgency === 'high') return 2
    return 3
  }
  const pendingTasks = todayTasks
    .filter((t) => t.status !== 'done' && t.status !== 'cancelled')
    .sort((a, b) => priorityScore(a) - priorityScore(b))
  const top3 = pendingTasks.slice(0, 3)

  // 오늘 마감 시간 있는 것
  const dueTodayWithTime = todayTasks
    .filter((t) => t.dueTime && t.status !== 'done')
    .sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))

  // 이번 주 요일별
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const dEnd = new Date(d)
    dEnd.setDate(d.getDate() + 1)
    const dayTasks = weekTasks.filter((t) => {
      const td = new Date(t.taskDate)
      return td >= d && td < dEnd
    })
    return {
      label: dayLabels[i],
      total: dayTasks.length,
      done: dayTasks.filter((t) => t.status === 'done').length,
      isToday: d.toDateString() === today.toDateString(),
    }
  })

  // 오늘 루틴 성공률
  const todayRoutineDoneIds = new Set(todayRoutineLogs.map((l) => l.routineId))
  const routineSuccessRate = activeRoutines.length > 0
    ? Math.round((activeRoutines.filter((r) => todayRoutineDoneIds.has(r.id)).length / activeRoutines.length) * 100)
    : null

  const dateStr = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '수고하셨어요'

  return (
    <div className="p-6 space-y-5 max-w-none">

      {/* ── 컴팩트 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{dateStr}</p>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            오늘 <span className="font-semibold text-gray-700 dark:text-gray-200">{pendingTodayCount}개</span> 남았어요
            {overdueTasks.length > 0 && (
              <span className="ml-2 text-red-500 font-semibold">· 지연 {overdueTasks.length}개 ⚠</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tasks/today"
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            할일 추가
          </Link>
        </div>
      </div>

      {/* ── Row 1: 6 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="오늘 할 일"
          value={todayTasks.length}
          sub={`미완료 ${pendingTodayCount}개`}
          href="/tasks/today"
          color="bg-blue-50 dark:bg-blue-900/30 text-blue-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="오늘 완료"
          value={doneTodayCount}
          sub={`달성률 ${todayPct}%`}
          color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="지연된 일"
          value={overdueTasks.length}
          sub={overdueTasks.length > 0 ? '즉시 처리 필요' : '모두 정상'}
          alert={overdueTasks.length > 0}
          href="/tasks"
          color={overdueTasks.length > 0
            ? 'bg-red-50 dark:bg-red-900/30 text-red-500'
            : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          label="이번 주 완료율"
          value={`${weekPct}%`}
          sub={`${weekDone}/${weekTasks.length}개`}
          color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          label="진행 프로젝트"
          value={activeProjectCount}
          sub={activeProjectCount > 0 ? '진행·기획 중' : '프로젝트 없음'}
          href="/projects"
          color="bg-violet-50 dark:bg-violet-900/30 text-violet-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
        />
        <StatCard
          label="루틴 성공률"
          value={routineSuccessRate !== null ? `${routineSuccessRate}%` : '—'}
          sub={activeRoutines.length > 0 ? `오늘 ${activeRoutines.filter((r) => todayRoutineDoneIds.has(r.id)).length}/${activeRoutines.length}개` : '루틴 없음'}
          href="/routines"
          color="bg-amber-50 dark:bg-amber-900/30 text-amber-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
        />
      </div>

      {/* ── Row 2: 우선순위 + 주간그래프 + 알림 ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* 오늘 우선순위 Top 3 */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">오늘 우선순위</h3>
              <p className="text-xs text-gray-400 mt-0.5">바로 처리해야 할 Top 3</p>
            </div>
            <Link href="/tasks/today" className="text-xs text-blue-500 hover:underline font-medium">전체 보기</Link>
          </div>

          {top3.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-300 dark:text-gray-700">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">모든 우선순위 할일을 완료했어요!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {top3.map((task, idx) => {
                const rank = (idx + 1) as 1 | 2 | 3
                return (
                  <div key={task.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                      task.status === 'done'
                        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <QuickCompleteBtn taskId={task.id} done={task.status === 'done'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PriorityRank rank={rank} />
                        {task.dueTime && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="9" strokeWidth={2} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
                            </svg>
                            {task.dueTime}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-semibold leading-snug ${
                        task.status === 'done'
                          ? 'line-through text-gray-400'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {task.title}
                      </p>
                    </div>
                  </div>
                )
              })}

              {pendingTasks.length > 3 && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  + {pendingTasks.length - 3}개 더 있습니다
                </p>
              )}
            </div>
          )}

          {/* 오늘 진행률 */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">오늘 진행률</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{todayPct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${todayPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">완료 {doneTodayCount}</span>
              <span className="text-[10px] text-gray-400">전체 {todayTasks.length}</span>
            </div>
          </div>
        </div>

        {/* 이번 주 현황 그래프 */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">이번 주 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">요일별 등록 / 완료</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900 dark:text-white">{weekPct}%</p>
              <p className="text-[10px] text-gray-400">주간 완료율</p>
            </div>
          </div>

          <div className="mt-4">
            <WeekBarImproved days={weekDays} />
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-3 h-2 rounded-sm bg-gray-100 dark:bg-gray-800 inline-block" />전체
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-3 h-2 rounded-sm bg-emerald-400 inline-block" />완료
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" />오늘
            </span>
          </div>
        </div>

        {/* 주의/알림 */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          {/* 지연 알림 */}
          <div className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 ${
            overdueTasks.length > 0
              ? 'border-red-200 dark:border-red-900/50'
              : 'border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                overdueTasks.length > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <svg className={`w-3.5 h-3.5 ${overdueTasks.length > 0 ? 'text-red-500' : 'text-gray-400'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className={`text-xs font-bold ${overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                지연된 일 {overdueTasks.length}건
              </span>
            </div>
            {overdueTasks.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">지연된 항목 없음 ✓</p>
            ) : (
              <ul className="space-y-1.5">
                {overdueTasks.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{t.title}</span>
                  </li>
                ))}
                {overdueTasks.length > 3 && (
                  <li className="text-xs text-red-400 pl-3.5">+ {overdueTasks.length - 3}건 더</li>
                )}
              </ul>
            )}
          </div>

          {/* 오늘 마감 시간 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
                </svg>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                오늘 마감 {dueTodayWithTime.length}건
              </span>
            </div>
            {dueTodayWithTime.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">마감 시간 없음</p>
            ) : (
              <ul className="space-y-1.5">
                {dueTodayWithTime.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{t.title}</span>
                    <span className="text-[10px] font-mono text-blue-500 flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                      {t.dueTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── 시간 관리 요약 ── */}
      {todayTimeBlocks.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-200 dark:border-blue-900">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">오늘 시간 계획</h3>
                <p className="text-xs text-gray-400 mt-0.5">{todayTimeBlocks.length}개 블록 · {fmtMin(tbPlannedMin)} 계획</p>
              </div>
            </div>
            <Link href="/time" className="text-xs text-blue-500 hover:underline font-medium">시간표 보기</Link>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center">
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">{fmtMin(tbPlannedMin)}</p>
              <p className="text-[10px] text-gray-400">계획</p>
            </div>
            <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                style={{ width: tbPlannedMin > 0 ? `${Math.round(tbDoneMin / tbPlannedMin * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{fmtMin(tbDoneMin)}</p>
              <p className="text-[10px] text-gray-400">완료</p>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {todayTimeBlocks.slice(0, 6).map((b) => (
              <div
                key={b.id}
                className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold text-white"
                style={{ backgroundColor: b.status === 'done' ? '#9CA3AF' : b.color, opacity: b.status === 'done' ? 0.7 : 1 }}
              >
                {b.status === 'done' ? '✓ ' : ''}{b.startTime} {b.title.length > 8 ? b.title.slice(0, 8) + '…' : b.title}
              </div>
            ))}
            {todayTimeBlocks.length > 6 && (
              <div className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800">
                +{todayTimeBlocks.length - 6}개
              </div>
            )}
          </div>
          {nextBlock && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                다음: <span className="font-semibold text-gray-700 dark:text-gray-300">{nextBlock.startTime}</span> {nextBlock.title}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Row 3: 성장 트래킹 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 목표 현황 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-200 dark:border-blue-900">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">목표 현황</h3>
            </div>
            <Link href="/goals" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">→</Link>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">진행 중 목표 없음</p>
          ) : (
            <div className="space-y-3">
              {activeGoals.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{g.title}</span>
                    <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">{g.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${g.progress}%`, backgroundColor: g.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 루틴 현황 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-200 dark:border-amber-900">
                <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">오늘 루틴</h3>
            </div>
            <Link href="/routines" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">→</Link>
          </div>
          {activeRoutines.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">일별 루틴 없음</p>
          ) : (
            <div className="space-y-2">
              {activeRoutines.slice(0, 4).map((r) => {
                const done = todayRoutineDoneIds.has(r.id)
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${done ? '' : 'border-2'}`}
                      style={done ? { backgroundColor: r.color } : { borderColor: r.color }}>
                      {done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-xs truncate ${done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{r.title}</span>
                  </div>
                )
              })}
              {activeRoutines.length > 4 && (
                <p className="text-[10px] text-gray-400 text-center">+ {activeRoutines.length - 4}개 더</p>
              )}
            </div>
          )}
        </div>

        {/* 진행 테스트 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center border border-rose-200 dark:border-rose-900">
                <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">진행 테스트</h3>
            </div>
            <Link href="/tests" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">→</Link>
          </div>
          {activeTests.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">진행 중 테스트 없음</p>
          ) : (
            <div className="space-y-2.5">
              {activeTests.map((t) => {
                const statusCfg: Record<string, { label: string; cls: string }> = {
                  planning: { label: '기획', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
                  in_progress: { label: '진행', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
                  recording: { label: '기록', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
                }
                const sc = statusCfg[t.status] ?? { label: t.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.title}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 프로세스 현황 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-900">
                <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">프로세스</h3>
            </div>
            <Link href="/processes" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">→</Link>
          </div>
          {activeProcesses.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">진행 중 프로세스 없음</p>
          ) : (
            <div className="space-y-2.5">
              {activeProcesses.map((proc) => {
                const done = proc.steps.filter((s) => s.status === 'completed').length
                const inProg = proc.steps.filter((s) => s.status === 'in_progress').length
                const pct = proc.steps.length > 0 ? Math.round((done / proc.steps.length) * 100) : 0
                return (
                  <Link key={proc.id} href="/processes" className="block">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{proc.title}</span>
                      <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {inProg > 0 && (
                      <p className="text-[9px] text-blue-500 mt-0.5">진행 중 {inProg}단계</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
