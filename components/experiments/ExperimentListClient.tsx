'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteExperiment } from '@/app/actions/experiments'
import ExperimentModal from './ExperimentModal'
import ExperimentDetailModal from './ExperimentDetailModal'

type Log = { id: number; logType: string; note: string | null; createdAt: string }

type Experiment = {
  id: number
  title: string
  purpose: string | null
  hypothesis: string | null
  method: string | null
  testDate: string | null
  conditions: string | null
  content: string | null
  result: string | null
  problems: string | null
  improvements: string | null
  nextAction: string | null
  relatedLinks: string | null
  memo: string | null
  status: string
  createdAt: string
  logs: Log[]
}

const STATUS_KO: Record<string, string> = { in_progress: '진행 중', success: '성공', failure: '실패', on_hold: '보류' }
const STATUS_BADGE: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  success:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  failure:     'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  on_hold:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}
const STATUS_COLOR: Record<string, string> = {
  in_progress: '#3B82F6',
  success:     '#10B981',
  failure:     '#EF4444',
  on_hold:     '#F59E0B',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

/* ─── 카드 ─── */
function ExperimentCard({ exp, onDetail, onEdit, onDelete }: {
  exp: Experiment
  onDetail: (e: Experiment) => void
  onEdit: (e: Experiment) => void
  onDelete: (id: number) => void
}) {
  const color = STATUS_COLOR[exp.status]

  return (
    <div
      className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all cursor-pointer"
      onClick={() => onDetail(exp)}
    >
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[exp.status]}`}>
            {STATUS_KO[exp.status]}
          </span>
          {exp.testDate && (
            <span className="text-[10px] text-gray-400 ml-auto">{formatDate(exp.testDate)}</span>
          )}
        </div>

        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 leading-snug">{exp.title}</h3>

        {exp.purpose && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">{exp.purpose}</p>
        )}

        {exp.result && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2 mb-3">
            <p className="text-[10px] font-bold text-gray-400 mb-0.5">결과</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{exp.result}</p>
          </div>
        )}

        {exp.logs.length > 0 && (
          <p className="text-[10px] text-gray-400 mb-3">💬 로그 {exp.logs.length}개</p>
        )}

        <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onEdit(exp)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            수정
          </button>
          <button onClick={() => onDelete(exp.id)}
            className="flex items-center justify-center px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 리스트 행 ─── */
function ExperimentRow({ exp, onDetail, onEdit, onDelete }: {
  exp: Experiment
  onDetail: (e: Experiment) => void
  onEdit: (e: Experiment) => void
  onDelete: (id: number) => void
}) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={() => onDetail(exp)}
    >
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[exp.status] }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{exp.title}</p>
        {exp.purpose && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{exp.purpose}</p>
        )}
      </div>

      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[exp.status]}`}>
        {STATUS_KO[exp.status]}
      </span>

      {exp.testDate && (
        <span className="text-xs text-gray-400 flex-shrink-0 w-14 text-right">{formatDate(exp.testDate)}</span>
      )}

      {exp.logs.length > 0 && (
        <span className="text-[10px] text-gray-400 flex-shrink-0">💬{exp.logs.length}</span>
      )}

      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onEdit(exp)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(exp.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ─── 필터 ─── */
type FilterKey = 'all' | 'in_progress' | 'success' | 'failure' | 'on_hold'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: '전체' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'success',     label: '성공' },
  { key: 'failure',     label: '실패' },
  { key: 'on_hold',     label: '보류' },
]

/* ─── 메인 ─── */
export default function ExperimentListClient({ experiments }: { experiments: Experiment[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<'card' | 'list'>('card')
  const [showAdd, setShowAdd] = useState(false)
  const [editExp, setEditExp] = useState<Experiment | null>(null)
  const [detailExp, setDetailExp] = useState<Experiment | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtered = filter === 'all' ? experiments : experiments.filter((e) => e.status === filter)

  const stats = {
    total:       experiments.length,
    in_progress: experiments.filter((e) => e.status === 'in_progress').length,
    success:     experiments.filter((e) => e.status === 'success').length,
    failure:     experiments.filter((e) => e.status === 'failure').length,
    successRate: experiments.filter((e) => e.status === 'success' || e.status === 'failure').length > 0
      ? Math.round(experiments.filter((e) => e.status === 'success').length
          / experiments.filter((e) => e.status === 'success' || e.status === 'failure').length * 100)
      : 0,
  }

  function handleDelete(id: number) {
    if (!confirm('테스트를 삭제하시겠습니까?')) return
    startTransition(() => { deleteExperiment(id) })
  }
  function handleAddClose() { setShowAdd(false); router.refresh() }
  function handleEditClose() { setEditExp(null); router.refresh() }
  function openEdit(e: Experiment) { setDetailExp(null); setEditExp(e) }

  return (
    <div className="p-8">
      {/* 배너 */}
      <div className="relative bg-orange-950 rounded-2xl mb-6 overflow-hidden">
        <div className="h-1 bg-orange-500" />
        <div className="px-7 py-6">
          <div className="absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #f97316 0%, transparent 60%)' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white mb-0.5">테스트 관리</h1>
              <p className="text-orange-300 text-sm">목적·가설·결과를 체계적으로 기록하고 인사이트를 쌓습니다</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-950 text-sm font-bold rounded-xl hover:bg-orange-50 transition-colors shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              테스트 추가
            </button>
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체 테스트', value: stats.total,       color: 'text-gray-700 dark:text-white' },
          { label: '진행 중',     value: stats.in_progress, color: 'text-blue-600 dark:text-blue-400' },
          { label: '성공',        value: stats.success,     color: 'text-emerald-600 dark:text-emerald-400' },
          { label: '성공률',      value: `${stats.successRate}%`, color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 필터 + 뷰 토글 */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex-shrink-0">
          <button onClick={() => setView('card')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button onClick={() => setView('list')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <p className="text-sm font-medium mb-2">테스트가 없습니다</p>
          {filter === 'all' && (
            <button onClick={() => setShowAdd(true)} className="text-sm text-orange-500 hover:underline font-medium">
              + 첫 번째 테스트 추가하기
            </button>
          )}
        </div>
      )}

      {/* 카드 뷰 */}
      {view === 'card' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <ExperimentCard key={e.id} exp={e} onDetail={setDetailExp} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {filtered.map((e, i) => (
            <div key={e.id} className={i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>
              <ExperimentRow exp={e} onDetail={setDetailExp} onEdit={openEdit} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {showAdd && <ExperimentModal onClose={handleAddClose} />}
      {editExp && (
        <ExperimentModal
          experiment={{ ...editExp, testDate: editExp.testDate ? new Date(editExp.testDate) : null }}
          onClose={handleEditClose}
        />
      )}
      {detailExp && (
        <ExperimentDetailModal
          experiment={detailExp}
          logs={detailExp.logs}
          onClose={() => setDetailExp(null)}
          onEdit={() => openEdit(detailExp)}
        />
      )}
    </div>
  )
}
