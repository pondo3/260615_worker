'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTest } from '@/app/actions/tests'
import TestModal from './TestModal'

type Snapshot = { checkpoint: 'initial' | 'after_12h' | 'after_48h'; value: number | null; memo: string | null }
type Link = { id: number; label: string; url: string; memo: string | null }
type ModalLink = { label: string; url: string; memo: string }
type ModalSnapshot = { checkpoint: 'initial' | 'after_12h' | 'after_48h'; value: string; memo: string }
type ModalTest = Omit<Test, 'links' | 'snapshots'> & { links: ModalLink[]; snapshots: ModalSnapshot[] }

type Test = {
  id: number
  title: string
  platform: string
  customPlatform: string | null
  testType: string
  customTestType: string | null
  targetName: string | null
  startDate: string | null
  endDate: string | null
  purpose: string | null
  hypothesis: string | null
  method: string | null
  conditions: string | null
  successCriteria: string | null
  preMemo: string | null
  primaryMetric: string
  customPrimaryMetric: string | null
  metricDirection: string
  status: string
  resultStatus: string | null
  resultSummary: string | null
  analysisMemo: string | null
  nextAction: string | null
  createdAt: string
  links: Link[]
  snapshots: Snapshot[]
}

/* ─── 상수 ─── */
const STATUS_KO: Record<string, string> = {
  planning: '계획중', in_progress: '진행중', recording: '결과입력중', completed: '완료', on_hold: '보류'
}
const RESULT_KO: Record<string, string> = { success: '성공', failure: '실패', unclear: '애매함', pending: '보류' }
const STATUS_BADGE: Record<string, string> = {
  planning:    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  recording:   'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  on_hold:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}
const RESULT_BADGE: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  failure: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  unclear: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}
const ALL_PLATFORMS = ['유튜브', '네이버 블로그', '인스타그램', '틱톡', '웹사이트', '광고', '스마트스토어', '플레이스']

/* ─── 수치 계산 ─── */
function getSnap(snapshots: Snapshot[], checkpoint: 'initial' | 'after_12h' | 'after_48h') {
  return snapshots.find((s) => s.checkpoint === checkpoint)?.value ?? null
}

function calcChange(from: number | null, to: number | null, dir: string) {
  if (from === null || to === null) return null
  const diff = to - from
  const pct = from !== 0 ? ((diff / from) * 100).toFixed(1) : null
  if (dir === 'lower_better') {
    // 낮을수록 좋음: 감소가 긍정적
    return { diff: -diff, pct: pct ? String(-parseFloat(pct)) : null, raw: diff }
  }
  return { diff, pct, raw: diff }
}

function formatNum(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('ko-KR')
}

function ChangeChip({ diff, pct, dir }: { diff: number | null; pct: string | null; dir: string }) {
  if (diff === null) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
  const rawDiff = dir === 'lower_better' ? -diff : diff
  const isGood = dir === 'lower_better' ? diff > 0 : diff > 0
  const isNeutral = diff === 0

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      isNeutral ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      : isGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
    }`}>
      {rawDiff > 0 ? '+' : ''}{rawDiff.toLocaleString('ko-KR')}
      {pct && ` (${diff > 0 ? '+' : ''}${pct}%)`}
    </span>
  )
}

/* ─── 카드 ─── */
function TestCard({ test, onEdit, onDelete }: {
  test: Test
  onEdit: (t: Test) => void
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const metric = test.primaryMetric === '기타' ? test.customPrimaryMetric : test.primaryMetric
  const platform = test.platform === '기타' ? test.customPlatform : test.platform
  const testType = test.testType === '기타' ? test.customTestType : test.testType
  const dir = test.metricDirection

  const initial   = getSnap(test.snapshots, 'initial')
  const after12h  = getSnap(test.snapshots, 'after_12h')
  const after48h  = getSnap(test.snapshots, 'after_48h')
  const change12h = calcChange(initial, after12h, dir)
  const change48h = calcChange(initial, after48h, dir)

  const hasSnapshots = initial !== null || after12h !== null || after48h !== null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
      {/* 색상 줄 */}
      <div className="h-0.5 bg-orange-400" />
      <div className="p-5">
        {/* 배지 */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[test.status]}`}>
            {STATUS_KO[test.status]}
          </span>
          {test.resultStatus && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RESULT_BADGE[test.resultStatus]}`}>
              {RESULT_KO[test.resultStatus]}
            </span>
          )}
          {platform && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{platform}</span>}
          {testType && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{testType}</span>}
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-snug">{test.title}</h3>
        {test.targetName && <p className="text-[11px] text-gray-400 mb-2">{test.targetName}</p>}
        {test.purpose && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{test.purpose}</p>}

        {/* 수치 요약 */}
        {hasSnapshots && metric && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-3">
            <p className="text-[10px] font-bold text-gray-400 mb-2">{metric}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: '등록', value: initial },
                { label: '12h', value: after12h },
                { label: '48h', value: after48h },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-black text-gray-800 dark:text-gray-100">{formatNum(value)}</p>
                </div>
              ))}
            </div>
            {(change12h || change48h) && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {change12h && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span>12h:</span>
                    <ChangeChip diff={change12h.diff} pct={change12h.pct} dir={dir} />
                  </div>
                )}
                {change48h && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span>48h:</span>
                    <ChangeChip diff={change48h.diff} pct={change48h.pct} dir={dir} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 링크 */}
        {test.links.length > 0 && (
          <div className="mb-3">
            <button type="button" onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors">
              🔗 링크 {test.links.length}개 {expanded ? '▲' : '▼'}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {test.links.map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2 group" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-semibold text-orange-500 group-hover:underline truncate">{l.label || l.url}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 액션 */}
        <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
          <button onClick={() => onEdit(test)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            수정
          </button>
          <button onClick={() => onDelete(test.id)}
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

/* ─── 테이블 행 ─── */
function TestRow({ test, onEdit, onDelete }: {
  test: Test
  onEdit: (t: Test) => void
  onDelete: (id: number) => void
}) {
  const metric = test.primaryMetric === '기타' ? test.customPrimaryMetric : test.primaryMetric
  const platform = test.platform === '기타' ? test.customPlatform : test.platform
  const testType = test.testType === '기타' ? test.customTestType : test.testType
  const dir = test.metricDirection

  const initial   = getSnap(test.snapshots, 'initial')
  const after12h  = getSnap(test.snapshots, 'after_12h')
  const after48h  = getSnap(test.snapshots, 'after_48h')
  const change12h = calcChange(initial, after12h, dir)
  const change48h = calcChange(initial, after48h, dir)

  return (
    <tr className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
      <td className="px-4 py-3 min-w-[180px]">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[200px]">{test.title}</p>
        {test.targetName && <p className="text-[10px] text-gray-400 truncate">{test.targetName}</p>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">{platform}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">{testType}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{metric}</span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatNum(initial)}</span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatNum(after12h)}</span>
          {change12h && <ChangeChip diff={change12h.diff} pct={change12h.pct} dir={dir} />}
        </div>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatNum(after48h)}</span>
          {change48h && <ChangeChip diff={change48h.diff} pct={change48h.pct} dir={dir} />}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {test.resultStatus
          ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RESULT_BADGE[test.resultStatus]}`}>{RESULT_KO[test.resultStatus]}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        }
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[test.status]}`}>
          {STATUS_KO[test.status]}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
        {new Date(test.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-0.5">
          <button onClick={() => onEdit(test)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(test.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ─── 메인 ─── */
export default function TestListClient({ tests }: { tests: Test[] }) {
  const [view, setView] = useState<'card' | 'table'>('table')
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterResult, setFilterResult] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTest, setEditTest] = useState<ModalTest | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  // 검색 & 필터
  const filtered = tests.filter((t) => {
    if (search) {
      const q = search.toLowerCase()
      const hit = t.title.toLowerCase().includes(q)
        || (t.platform?.toLowerCase().includes(q) ?? false)
        || (t.testType?.toLowerCase().includes(q) ?? false)
        || (t.hypothesis?.toLowerCase().includes(q) ?? false)
        || (t.preMemo?.toLowerCase().includes(q) ?? false)
        || (t.analysisMemo?.toLowerCase().includes(q) ?? false)
      if (!hit) return false
    }
    if (filterPlatform && t.platform !== filterPlatform) return false
    if (filterType && t.testType !== filterType) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterResult && t.resultStatus !== filterResult) return false
    return true
  })

  const stats = {
    total:     tests.length,
    active:    tests.filter((t) => t.status === 'in_progress' || t.status === 'recording').length,
    completed: tests.filter((t) => t.status === 'completed').length,
    success:   tests.filter((t) => t.resultStatus === 'success').length,
  }

  const platforms = [...new Set(tests.map((t) => t.platform === '기타' ? (t.customPlatform ?? '기타') : t.platform).filter(Boolean))]
  const testTypes = [...new Set(tests.map((t) => t.testType === '기타' ? (t.customTestType ?? '기타') : t.testType).filter(Boolean))]

  function handleDelete(id: number) {
    if (!confirm('테스트를 삭제하시겠습니까?')) return
    startTransition(() => { deleteTest(id) })
  }
  function handleAddClose() { setShowAdd(false); router.refresh() }
  function handleEditClose() { setEditTest(null); router.refresh() }

  const toModalTest = (t: Test): ModalTest => ({
    ...t,
    links: t.links.map((l) => ({ label: l.label, url: l.url, memo: l.memo ?? '' })),
    snapshots: (['initial', 'after_12h', 'after_48h'] as const).map((cp) => {
      const s = t.snapshots.find((s) => s.checkpoint === cp)
      return { checkpoint: cp, value: s?.value !== null && s?.value !== undefined ? String(s.value) : '', memo: s?.memo ?? '' }
    }),
  })

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
              <p className="text-orange-300 text-sm">유튜브·블로그·광고 등 모든 채널의 테스트를 기록하고 변화량을 비교합니다</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: '전체 테스트', value: stats.total,     color: 'text-gray-700 dark:text-white' },
          { label: '진행 중',     value: stats.active,    color: 'text-blue-600 dark:text-blue-400' },
          { label: '완료',        value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: '성공',        value: stats.success,   color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="테스트명, 플랫폼, 유형, 가설, 메모로 검색..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors"
        />
      </div>

      {/* 필터 + 뷰 토글 */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {/* 플랫폼 필터 */}
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-gray-600 dark:text-gray-400 outline-none focus:border-orange-400 transition-colors">
            <option value="">전체 플랫폼</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* 유형 필터 */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-gray-600 dark:text-gray-400 outline-none focus:border-orange-400 transition-colors">
            <option value="">전체 유형</option>
            {testTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {/* 상태 필터 */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-gray-600 dark:text-gray-400 outline-none focus:border-orange-400 transition-colors">
            <option value="">전체 상태</option>
            {Object.entries(STATUS_KO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {/* 결과 판정 필터 */}
          <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-gray-600 dark:text-gray-400 outline-none focus:border-orange-400 transition-colors">
            <option value="">전체 판정</option>
            {Object.entries(RESULT_KO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {(search || filterPlatform || filterType || filterStatus || filterResult) && (
            <button
              onClick={() => { setSearch(''); setFilterPlatform(''); setFilterType(''); setFilterStatus(''); setFilterResult('') }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              초기화
            </button>
          )}
        </div>
        {/* 뷰 토글 */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex-shrink-0">
          <button onClick={() => setView('table')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'table' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}
            title="테이블 뷰">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
            </svg>
          </button>
          <button onClick={() => setView('card')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}
            title="카드 뷰">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* 결과 수 */}
      {filtered.length !== tests.length && (
        <p className="text-xs text-gray-400 mb-3">{filtered.length}개 결과</p>
      )}

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <p className="text-sm font-medium mb-2">테스트가 없습니다</p>
          {!search && !filterPlatform && !filterType && !filterStatus && !filterResult && (
            <button onClick={() => setShowAdd(true)} className="text-sm text-orange-500 hover:underline font-medium">
              + 첫 번째 테스트 추가하기
            </button>
          )}
        </div>
      )}

      {/* 테이블 뷰 */}
      {view === 'table' && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {['테스트명', '플랫폼', '유형', '지표', '등록 시점', '12시간 후', '48시간 후', '결과 판정', '상태', '날짜', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <TestRow key={t.id} test={t} onEdit={(t) => setEditTest(toModalTest(t))} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 카드 뷰 */}
      {view === 'card' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TestCard key={t.id} test={t} onEdit={(t) => setEditTest(toModalTest(t))} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showAdd && <TestModal onClose={handleAddClose} />}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {editTest && <TestModal test={editTest as any} onClose={handleEditClose} />}
    </div>
  )
}
