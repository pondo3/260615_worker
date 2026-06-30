'use client'

import { useState, useTransition } from 'react'
import {
  createTimeBlock, updateTimeBlock, deleteTimeBlock,
  type TimeBlockWithRefs,
} from '@/app/actions/timeblocks'
import { BLOCK_TYPES, BLOCK_TYPE_COLORS } from '@/lib/timeUtils'

type Task = { id: number; title: string; importance: string; estimatedMinutes: number | null }
type Project = { id: number; title: string; color: string }
type Routine = { id: number; title: string; timeOfDay: string | null }

type Props = {
  block: TimeBlockWithRefs | null
  defaultDate: string
  defaultTime: { startTime: string; endTime: string } | null
  defaultValues?: { title?: string; taskId?: number; routineId?: number; blockType?: string } | null
  tasks: Task[]
  projects: Project[]
  routines: Routine[]
  onClose: () => void
  onSaved: () => void
}

const IMPORTANCE_OPTS = [
  { value: 'high', label: '높음', color: 'text-red-600' },
  { value: 'medium', label: '보통', color: 'text-amber-600' },
  { value: 'low', label: '낮음', color: 'text-gray-500' },
]

const STATUS_OPTS = [
  { value: 'planned', label: '계획됨' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'done', label: '완료' },
  { value: 'skipped', label: '건너뜀' },
]

function defaultHour(): string {
  const h = new Date().getHours()
  const next = Math.min(h + 1, 22)
  return `${String(next).padStart(2, '0')}:00`
}

export default function TimeBlockModal({ block, defaultDate, defaultTime, defaultValues, tasks, projects, routines, onClose, onSaved }: Props) {
  const isEdit = block !== null
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState(block?.title ?? defaultValues?.title ?? '')
  const [date, setDate] = useState(block?.date ?? defaultDate)
  const [startTime, setStartTime] = useState(block?.startTime ?? defaultTime?.startTime ?? defaultHour())
  const [endTime, setEndTime] = useState(block?.endTime ?? defaultTime?.endTime ?? (() => {
    const h = parseInt(defaultHour()) + 1
    return `${String(Math.min(h, 23)).padStart(2, '0')}:00`
  })())
  const [blockType, setBlockType] = useState(block?.blockType ?? defaultValues?.blockType ?? '업무')
  const [importance, setImportance] = useState(block?.importance ?? 'medium')
  const [status, setStatus] = useState(block?.status ?? 'planned')
  const [memo, setMemo] = useState(block?.memo ?? '')
  const [alertEnabled, setAlertEnabled] = useState(block?.alertEnabled ?? false)
  const [alertMinutes, setAlertMinutes] = useState(block?.alertMinutes ?? 10)
  const [taskId, setTaskId] = useState<number | ''>(block?.taskId ?? defaultValues?.taskId ?? '')
  const [projectId, setProjectId] = useState<number | ''>(block?.projectId ?? '')
  const [routineId, setRoutineId] = useState<number | ''>(block?.routineId ?? defaultValues?.routineId ?? '')
  const [error, setError] = useState('')

  const color = BLOCK_TYPE_COLORS[blockType] ?? '#6366F1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (startTime >= endTime) { setError('종료 시간이 시작 시간보다 늦어야 합니다'); return }
    setError('')

    startTransition(async () => {
      const data = {
        title,
        date,
        startTime,
        endTime,
        blockType,
        importance,
        status,
        memo: memo || undefined,
        alertEnabled,
        alertMinutes,
        taskId: taskId !== '' ? Number(taskId) : null,
        projectId: projectId !== '' ? Number(projectId) : null,
        routineId: routineId !== '' ? Number(routineId) : null,
        color,
      }

      let result
      if (isEdit) {
        result = await updateTimeBlock(block.id, data)
      } else {
        result = await createTimeBlock(data)
      }

      if (result.ok) {
        onSaved()
      } else {
        setError(result.error ?? '저장 실패')
      }
    })
  }

  async function handleDelete() {
    if (!block || !confirm('이 시간 블록을 삭제할까요?')) return
    startTransition(async () => {
      await deleteTimeBlock(block.id)
      onSaved()
    })
  }

  // 블록 유형 선택 시 자동 색상 + 예상 시간 적용
  function handleTypeChange(type: string) {
    setBlockType(type)
    if (type === '루틴' && routineId !== '') {
      const r = routines.find((r) => r.id === Number(routineId))
      if (r?.timeOfDay) setStartTime(r.timeOfDay)
    }
    if (type === '업무' || type === '개발 작업') {
      const task = tasks.find((t) => t.id === Number(taskId))
      if (task?.estimatedMinutes) {
        const [sh, sm] = startTime.split(':').map(Number)
        const endMin = sh * 60 + sm + task.estimatedMinutes
        const eh = Math.floor(endMin / 60)
        const em = endMin % 60
        setEndTime(`${String(Math.min(eh, 23)).padStart(2, '0')}:${String(em).padStart(2, '0')}`)
      }
    }
  }

  // 할 일 선택 시 예상 시간 자동 반영
  function handleTaskChange(id: number | '') {
    setTaskId(id)
    if (id !== '') {
      const task = tasks.find((t) => t.id === Number(id))
      if (task?.estimatedMinutes) {
        const [sh, sm] = startTime.split(':').map(Number)
        const endMin = sh * 60 + sm + task.estimatedMinutes
        const eh = Math.floor(endMin / 60)
        const em = endMin % 60
        setEndTime(`${String(Math.min(eh, 23)).padStart(2, '0')}:${String(em).padStart(2, '0')}`)
      }
    }
  }

  const durMin = (() => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex-1">
            {isEdit ? '시간 블록 수정' : '시간 블록 추가'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form id="timeblock-form" onSubmit={handleSubmit} />
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* 제목 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">제목 *</label>
            <input
              form="timeblock-form"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="무엇을 할 건가요?"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              autoFocus
            />
          </div>

          {/* 날짜 + 시간 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">날짜</label>
              <input
                form="timeblock-form"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">시작</label>
              <input
                form="timeblock-form"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">종료</label>
              <input
                form="timeblock-form"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {durMin > 0 && (
            <p className="text-xs text-gray-400 -mt-2">
              소요 시간: <span className="font-semibold text-gray-600 dark:text-gray-300">
                {durMin >= 60 ? `${Math.floor(durMin / 60)}시간 ` : ''}{durMin % 60 > 0 ? `${durMin % 60}분` : ''}
              </span>
            </p>
          )}

          {/* 유형 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">유형</label>
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    blockType === type
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                  style={blockType === type ? { backgroundColor: BLOCK_TYPE_COLORS[type] } : {}}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 중요도 + 상태 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">중요도</label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {IMPORTANCE_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 연결 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">연결하기 (선택)</p>
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">할 일</label>
              <select
                value={taskId}
                onChange={(e) => handleTaskChange(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">연결 안 함</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">프로젝트</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">연결 안 함</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">루틴</label>
              <select
                value={routineId}
                onChange={(e) => setRoutineId(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">연결 안 함</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}{r.timeOfDay ? ` (${r.timeOfDay})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 알림 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setAlertEnabled(!alertEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${alertEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${alertEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">알림</span>
            {alertEnabled && (
              <select
                value={alertMinutes}
                onChange={(e) => setAlertMinutes(Number(e.target.value))}
                className="ml-auto px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300"
              >
                {[5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>{m}분 전</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
            >
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            form="timeblock-form"
            disabled={pending}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {pending ? '저장 중...' : isEdit ? '수정 완료' : '블록 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
