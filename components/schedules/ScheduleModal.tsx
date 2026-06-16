'use client'

import { useActionState, useEffect, useState } from 'react'
import { createSchedule, updateSchedule } from '@/app/actions/schedules'

export type ScheduleData = {
  id: number
  title: string
  description: string | null
  scheduleDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  eventType: string
  status: string
  priority: string
  color: string
  completedAt: string | null
  notification: boolean
  projectId: number | null
  projectTitle: string | null
}

type Props = {
  onClose: () => void
  schedule?: ScheduleData
  defaultDate?: string
  projects: { id: number; title: string }[]
}

const EVENT_TYPES = ['일반', '업무', '개인', '할 일', '프로젝트 일정', '프로젝트 마감', '루틴', '테스트', '회의', '확인 필요', '기타']
const STATUS_OPTIONS = ['예정', '진행 중', '완료', '보류', '취소']
const PRIORITY_OPTIONS = ['낮음', '보통', '높음', '매우 중요']

const COLORS = [
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#059669', '#0D9488', '#DC2626', '#EA580C',
  '#D97706', '#F59E0B', '#475569', '#EC4899',
]

const STATUS_CLS: Record<string, string> = {
  '예정':    'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  '진행 중': 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  '완료':    'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  '보류':    'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  '취소':    'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
}
const PRIORITY_CLS: Record<string, string> = {
  '낮음':     'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-500',
  '보통':     'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  '높음':     'border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  '매우 중요': 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
}

export default function ScheduleModal({ onClose, schedule, defaultDate, projects }: Props) {
  const isEdit = !!schedule
  const action = isEdit ? updateSchedule : createSchedule
  const [state, formAction, pending] = useActionState(action, undefined)

  const [isAllDay, setIsAllDay] = useState(schedule?.isAllDay ?? true)
  const [color, setColor] = useState(schedule?.color ?? '#0EA5E9')
  const [date, setDate] = useState(schedule?.scheduleDate ?? defaultDate ?? '')
  const [endDate, setEndDate] = useState(schedule?.endDate ?? '')
  const [eventType, setEventType] = useState(schedule?.eventType ?? '일반')
  const [status, setStatus] = useState(schedule?.status ?? '예정')
  const [priority, setPriority] = useState(schedule?.priority ?? '보통')
  const [notification, setNotification] = useState(schedule?.notification ?? false)
  const [projectId, setProjectId] = useState(schedule?.projectId?.toString() ?? '')

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const errors = state && 'errors' in state ? state.errors : {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: color }} />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '일정 수정' : '일정 추가'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="flex-1 overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={schedule.id} />}
          <input type="hidden" name="isAllDay" value={String(isAllDay)} />
          <input type="hidden" name="color" value={color} />
          <input type="hidden" name="eventType" value={eventType} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="priority" value={priority} />
          <input type="hidden" name="notification" value={String(notification)} />
          <input type="hidden" name="projectId" value={projectId} />

          <div className="px-6 py-5 space-y-5">
            {/* 제목 */}
            <div>
              <input
                name="title"
                defaultValue={schedule?.title}
                placeholder="일정 제목 *"
                className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-sky-400 pb-2 transition-colors"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
            </div>

            {/* 날짜 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                  시작일 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="scheduleDate"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-sky-400 transition-colors"
                />
                {errors.scheduleDate && <p className="text-xs text-red-500 mt-1">{errors.scheduleDate[0]}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">종료일</label>
                <input
                  type="date"
                  name="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-sky-400 transition-colors"
                />
              </div>
            </div>

            {/* 종일 / 시간 */}
            <div>
              <button
                type="button"
                onClick={() => setIsAllDay(!isAllDay)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                  isAllDay
                    ? 'border-sky-300 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-colors ${isAllDay ? 'bg-sky-500 border-sky-500' : 'border-gray-400'}`}>
                  {isAllDay && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </span>
                종일 일정
              </button>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">시작 시간</label>
                    <input
                      type="time"
                      name="startTime"
                      defaultValue={schedule?.startTime ?? ''}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">종료 시간</label>
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={schedule?.endTime ?? ''}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 일정 유형 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">일정 유형</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEventType(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      eventType === t
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={eventType === t ? { backgroundColor: color } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 상태 + 중요도 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">상태</label>
                <div className="flex flex-col gap-1">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                        status === s ? STATUS_CLS[s] + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">중요도</label>
                <div className="flex flex-col gap-1">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                        priority === p ? PRIORITY_CLS[p] + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 색상 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">색상</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">메모</label>
              <textarea
                name="description"
                defaultValue={schedule?.description ?? ''}
                placeholder="일정 관련 메모"
                rows={3}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-sky-400 transition-colors resize-none"
              />
            </div>

            {/* 연결 프로젝트 */}
            {projects.length > 0 && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">연결 프로젝트</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-sky-400 transition-colors"
                >
                  <option value="">연결 안 함</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}

            {/* 알림 */}
            <button
              type="button"
              onClick={() => setNotification(!notification)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                notification
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400'
              }`}
            >
              <svg className="w-4 h-4" fill={notification ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notification ? '알림 설정됨' : '알림 추가'}
            </button>

            {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}
          </div>

          <div className="px-6 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 text-sm font-bold text-white hover:bg-sky-600 transition-colors disabled:opacity-50">
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '일정 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
