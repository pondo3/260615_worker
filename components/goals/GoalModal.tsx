'use client'

import { useActionState, useEffect, useState } from 'react'
import { createGoal, updateGoal } from '@/app/actions/goals'
import RichTextEditor from '@/components/tasks/RichTextEditor'

type Goal = {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  startDate: Date
  endDate: Date | null
  color: string
  progress?: number
}

type Props = {
  onClose: () => void
  goal?: Goal
}

const COLORS = [
  '#3B82F6', // 파랑
  '#7C3AED', // 보라
  '#0D9488', // 청록
  '#059669', // 초록
  '#DC2626', // 빨강
  '#EA580C', // 주황
  '#D97706', // 노랑
  '#4F46E5', // 인디고
  '#DB2777', // 핑크
  '#475569', // 슬레이트
]

const TYPE_OPTIONS = [
  { value: 'yearly', label: '연간', sub: '1년 단위 목표' },
  { value: 'monthly', label: '월간', sub: '한 달 단위 목표' },
  { value: 'weekly', label: '주간', sub: '일주일 단위 목표' },
  { value: 'custom', label: '기타', sub: '기간 직접 설정' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: '진행 중', cls: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { value: 'completed', label: '완료', cls: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  { value: 'paused', label: '일시 중단', cls: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
  { value: 'abandoned', label: '중단', cls: 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
]

function getDateRange(type: string): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (type === 'yearly') {
    return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
  if (type === 'monthly') {
    const firstDay = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    }
  }
  if (type === 'weekly') {
    const dayOfWeek = now.getDay()
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return {
      start: mon.toISOString().split('T')[0],
      end: sun.toISOString().split('T')[0],
    }
  }
  return { start: now.toISOString().split('T')[0], end: '' }
}

export default function GoalModal({ onClose, goal }: Props) {
  const isEdit = !!goal
  const action = isEdit ? updateGoal : createGoal
  const [state, formAction, pending] = useActionState(action, undefined)

  const [type, setType] = useState(goal?.type ?? 'monthly')
  const [startDate, setStartDate] = useState(
    goal ? new Date(goal.startDate).toISOString().split('T')[0] : getDateRange('monthly').start
  )
  const [endDate, setEndDate] = useState(
    goal?.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : getDateRange('monthly').end
  )
  const [color, setColor] = useState(goal?.color ?? '#3B82F6')
  const [status, setStatus] = useState(goal?.status ?? 'active')
  const [progress, setProgress] = useState(goal?.progress ?? 0)

  // 타입 변경 시 날짜 자동 세팅 (신규 등록 시에만)
  function handleTypeChange(newType: string) {
    setType(newType)
    if (!isEdit) {
      const range = getDateRange(newType)
      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 컬러 스트립 */}
        <div className="h-1 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: color }} />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '목표 수정' : '새 목표'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form action={formAction} className="flex-1 overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={goal.id} />}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />
          <input type="hidden" name="color" value={color} />
          <input type="hidden" name="progress" value={progress} />
          {isEdit && <input type="hidden" name="status" value={status} />}

          <div className="px-6 py-5 space-y-6">

            {/* 기본 정보 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">기본 정보</p>
              <div className="space-y-3">
                <div>
                  <input
                    name="title"
                    defaultValue={goal?.title}
                    placeholder="목표 제목을 입력하세요 *"
                    className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-blue-400 pb-2 transition-colors"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <RichTextEditor
                    name="description"
                    defaultValue={goal?.description ?? ''}
                    placeholder="목표 상세 내용을 입력하세요 (이미지 붙여넣기 가능)"
                  />
                </div>
              </div>
            </section>

            {/* 기간 설정 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">기간 설정</p>

              {/* 타입 선택 */}
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTypeChange(opt.value)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                      type === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <span className={`text-xs font-bold ${type === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">{opt.sub}</span>
                  </button>
                ))}
              </div>

              {/* 날짜 범위 */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 transition-colors"
                  />
                  {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate[0]}</p>}
                </div>
                <span className="text-gray-300 dark:text-gray-600 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">종료일 (선택)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* 진행률 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">진행률 (수동)</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">목표 달성도</span>
                  <span className="text-sm font-bold" style={{ color }}>{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: color }}
                />
                <div className="flex justify-between text-[10px] text-gray-300 dark:text-gray-600">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </section>

            {/* 카드 색상 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">카드 색상</p>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </section>

            {/* 상태 (수정 시에만) */}
            {isEdit && (
              <section>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">상태</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                        status === opt.value
                          ? opt.cls + ' border-current'
                          : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {errors.general && (
              <p className="text-xs text-red-500">{errors.general[0]}</p>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="px-6 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: color }}>
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '목표 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
