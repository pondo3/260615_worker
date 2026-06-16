'use client'

import { useActionState, useEffect, useState } from 'react'
import { createRoutine, updateRoutine } from '@/app/actions/routines'

type Routine = {
  id: number
  title: string
  description: string | null
  frequency: string
  daysOfWeek: number[] | null
  timeOfDay: string | null
  color: string
  status: string
  startDate: Date | null
  endDate: Date | null
}

type Props = { onClose: () => void; routine?: Routine }

const COLORS = [
  '#6366F1', '#3B82F6', '#0D9488', '#059669',
  '#DC2626', '#EA580C', '#D97706', '#7C3AED',
  '#DB2777', '#475569',
]

const FREQ_OPTIONS = [
  { value: 'daily',   label: '매일',   desc: '매일 반복' },
  { value: 'weekly',  label: '매주',   desc: '특정 요일 반복' },
  { value: 'monthly', label: '매월',   desc: '매월 특정 날 반복' },
  { value: 'custom',  label: '직접',   desc: '기간 내 자유 설정' },
]

const STATUS_OPTIONS = [
  { value: 'active',   label: '진행 중', cls: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { value: 'paused',   label: '일시 중단', cls: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
  { value: 'archived', label: '보관',    cls: 'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
]

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function toDateInput(d: Date | null | undefined) {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

export default function RoutineModal({ onClose, routine }: Props) {
  const isEdit = !!routine
  const action = isEdit ? updateRoutine : createRoutine
  const [state, formAction, pending] = useActionState(action, undefined)

  const [freq, setFreq] = useState(routine?.frequency ?? 'daily')
  const [days, setDays] = useState<number[]>(routine?.daysOfWeek ?? [])
  const [color, setColor] = useState(routine?.color ?? '#6366F1')
  const [status, setStatus] = useState(routine?.status ?? 'active')
  const [startDate, setStartDate] = useState(toDateInput(routine?.startDate))
  const [endDate, setEndDate] = useState(toDateInput(routine?.endDate))

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())
  }

  const errors = state && 'errors' in state ? state.errors : {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: color }} />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '루틴 수정' : '새 루틴'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="flex-1 overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={routine.id} />}
          <input type="hidden" name="frequency" value={freq} />
          <input type="hidden" name="daysOfWeek" value={JSON.stringify(days)} />
          <input type="hidden" name="color" value={color} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />
          {isEdit && <input type="hidden" name="status" value={status} />}

          <div className="px-6 py-5 space-y-6">

            {/* 제목 + 시간 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">기본 정보</p>
              <div className="space-y-3">
                <div>
                  <input
                    name="title"
                    defaultValue={routine?.title}
                    placeholder="루틴 이름 *"
                    className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-indigo-400 pb-2 transition-colors"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
                </div>
                <textarea
                  name="description"
                  defaultValue={routine?.description ?? ''}
                  placeholder="루틴에 대한 메모 (선택)"
                  rows={2}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors resize-none"
                />
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">실행 시간 (선택)</label>
                  <input
                    type="time"
                    name="timeOfDay"
                    defaultValue={routine?.timeOfDay ?? ''}
                    className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* 반복 주기 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">반복 주기</p>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {FREQ_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFreq(opt.value)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                      freq === opt.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}>
                    <span className={`text-xs font-bold ${freq === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {/* 요일 선택 (매주일 때만) */}
              {freq === 'weekly' && (
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_LABELS.map((label, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                        days.includes(i)
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      style={days.includes(i) ? { backgroundColor: color } : {}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 기간 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">기간 (선택)</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">시작일</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors" />
                </div>
                <span className="text-gray-300 dark:text-gray-600 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">종료일</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors" />
                </div>
              </div>
            </section>

            {/* 색상 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">색상</p>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </section>

            {/* 상태 (수정 시만) */}
            {isEdit && (
              <section>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">상태</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                        status === opt.value ? opt.cls + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}
          </div>

          <div className="px-6 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: color }}>
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '루틴 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
