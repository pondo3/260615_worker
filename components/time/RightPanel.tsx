'use client'

import { useState } from 'react'

type Task = { id: number; title: string; importance: string; dueTime: string | null; estimatedMinutes: number | null }
type Routine = { id: number; title: string; timeOfDay: string | null; frequency: string; color: string }
type Project = { id: number; title: string; color: string }

type Props = {
  tasks: Task[]
  routines: Routine[]
  doneRoutineIds: number[]
  projects: Project[]
  scheduledBlockTaskIds: number[]
  onScheduleTask: (task: Task) => void
  onRefresh: () => void
}

type Section = 'tasks' | 'routines' | 'projects'

const IMPORTANCE_COLOR: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-gray-400',
}

export default function RightPanel({
  tasks, routines, doneRoutineIds, projects, scheduledBlockTaskIds, onScheduleTask,
}: Props) {
  const [section, setSection] = useState<Section>('tasks')

  const unscheduledTasks = tasks.filter((t) => !scheduledBlockTaskIds.includes(t.id))
  const scheduledTasks = tasks.filter((t) => scheduledBlockTaskIds.includes(t.id))

  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* 탭 헤더 */}
      <div className="flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="flex">
          {([
            { key: 'tasks', label: '할 일', count: unscheduledTasks.length },
            { key: 'routines', label: '루틴', count: routines.length },
            { key: 'projects', label: '프로젝트', count: projects.length },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSection(tab.key)}
              className={`flex-1 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ${
                section === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {/* 할 일 */}
        {section === 'tasks' && (
          <div className="p-3 space-y-1">
            {unscheduledTasks.length === 0 && scheduledTasks.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                <p className="text-sm">오늘 할 일이 없습니다</p>
              </div>
            )}

            {unscheduledTasks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">미배치 할 일</p>
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      task.importance === 'high' ? 'bg-red-500' :
                      task.importance === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{task.title}</p>
                      {task.estimatedMinutes && (
                        <p className="text-[10px] text-gray-400">
                          예상 {task.estimatedMinutes >= 60
                            ? `${Math.floor(task.estimatedMinutes / 60)}h`
                            : `${task.estimatedMinutes}m`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onScheduleTask(task)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-500 hover:bg-blue-100 transition-all"
                      title="시간표에 배치"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {scheduledTasks.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">배치된 할 일</p>
                {scheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded-lg opacity-50"
                  >
                    <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 루틴 */}
        {section === 'routines' && (
          <div className="p-3 space-y-1">
            {routines.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                <p className="text-sm">오늘 루틴이 없습니다</p>
              </div>
            )}
            {routines.map((r) => {
              const done = doneRoutineIds.includes(r.id)
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                    done ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors`}
                    style={done
                      ? { backgroundColor: r.color, borderColor: r.color }
                      : { borderColor: r.color }}
                  >
                    {done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${
                      done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>{r.title}</p>
                    {r.timeOfDay && (
                      <p className="text-[10px] text-gray-400">{r.timeOfDay}</p>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 flex-shrink-0">
                    {r.frequency === 'daily' ? '매일' : r.frequency === 'weekly' ? '주간' : '월간'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 프로젝트 */}
        {section === 'projects' && (
          <div className="p-3 space-y-1">
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                <p className="text-sm">진행 중 프로젝트 없음</p>
              </div>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: p.color }} />
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{p.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 푸터: 빠른 통계 */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-xs font-black text-gray-900 dark:text-white">{tasks.length}</p>
            <p className="text-[10px] text-gray-400">오늘 할 일</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              {routines.filter((r) => doneRoutineIds.includes(r.id)).length}/{routines.length}
            </p>
            <p className="text-[10px] text-gray-400">루틴 완료</p>
          </div>
        </div>
      </div>
    </div>
  )
}
