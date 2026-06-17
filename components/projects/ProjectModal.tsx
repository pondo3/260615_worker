'use client'

import { useActionState, useEffect, useState } from 'react'
import { createProject, updateProject } from '@/app/actions/projects'
import EditorWithAttachments from '@/components/editor/EditorWithAttachments'

type Project = {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  startDate: Date | null
  endDate: Date | null
  color: string
}

type Props = { onClose: () => void; project?: Project }

const COLORS = [
  '#7C3AED', '#3B82F6', '#0D9488', '#059669',
  '#DC2626', '#EA580C', '#D97706', '#4F46E5',
  '#DB2777', '#475569',
]

const TYPE_OPTIONS = [
  { value: 'work',     label: '업무',   sub: '회사·직장 프로젝트' },
  { value: 'personal', label: '개인',   sub: '개인 사이드 프로젝트' },
  { value: 'study',    label: '학습',   sub: '공부·연구·실험' },
  { value: 'other',    label: '기타',   sub: '분류하기 어려운 것' },
]

const STATUS_OPTIONS = [
  { value: 'planning',  label: '계획 중', cls: 'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  { value: 'active',    label: '진행 중', cls: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { value: 'completed', label: '완료',   cls: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  { value: 'paused',    label: '중단',   cls: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
]

function toDateInput(d: Date | null | undefined) {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

export default function ProjectModal({ onClose, project }: Props) {
  const isEdit = !!project
  const action = isEdit ? updateProject : createProject
  const [state, formAction, pending] = useActionState(action, undefined)

  const [type, setType] = useState(project?.type ?? 'personal')
  const [status, setStatus] = useState(project?.status ?? 'planning')
  const [startDate, setStartDate] = useState(toDateInput(project?.startDate))
  const [endDate, setEndDate] = useState(toDateInput(project?.endDate))
  const [color, setColor] = useState(project?.color ?? '#7C3AED')

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
        <div className="h-1 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: color }} />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '프로젝트 수정' : '새 프로젝트'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form action={formAction} className="flex-1 overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={project.id} />}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />
          <input type="hidden" name="color" value={color} />
          {isEdit && <input type="hidden" name="status" value={status} />}

          <div className="px-6 py-5 space-y-6">

            {/* 기본 정보 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">기본 정보</p>
              <div className="space-y-3">
                <div>
                  <input
                    name="title"
                    defaultValue={project?.title}
                    placeholder="프로젝트 이름을 입력하세요 *"
                    className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-violet-400 pb-2 transition-colors"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <EditorWithAttachments
                    name="description"
                    entityType="project"
                    entityId={project?.id}
                    defaultValue={project?.description ?? ''}
                    placeholder="프로젝트 목적, 배경, 상세 내용을 자유롭게 적어보세요"
                  />
                </div>
              </div>
            </section>

            {/* 분류 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">분류</p>
              <div className="grid grid-cols-4 gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                      type === opt.value
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}>
                    <span className={`text-xs font-bold ${type === opt.value ? 'text-violet-600 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 기간 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">기간 (선택)</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">시작일</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors" />
                </div>
                <span className="text-gray-300 dark:text-gray-600 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">마감일</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors" />
                </div>
              </div>
            </section>

            {/* 카드 색상 */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">카드 색상</p>
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
                <div className="grid grid-cols-2 gap-2">
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

          {/* 하단 버튼 */}
          <div className="px-6 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: color }}>
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '프로젝트 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
