'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Snapshot = { checkpoint: string; value: number | null; memo: string | null }

export type CompareTest = {
  id: number
  title: string
  platform: string
  customPlatform: string | null
  testType: string
  customTestType: string | null
  targetName: string | null
  startDate: string | null
  endDate: string | null
  primaryMetric: string
  customPrimaryMetric: string | null
  metricDirection: string
  status: string
  resultStatus: string | null
  resultSummary: string | null
  analysisMemo: string | null
  snapshots: Snapshot[]
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const COMPARE_COLORS = ['#14B8A6', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6']
const CHECKPOINTS = [
  { key: 'initial',    label: '시작' },
  { key: 'after_12h', label: '12시간 후' },
  { key: 'after_48h', label: '48시간 후' },
]

const STATUS_KO: Record<string, string> = {
  planning: '계획중', in_progress: '진행중', recording: '결과입력중', completed: '완료', on_hold: '보류',
}
const STATUS_CLS: Record<string, string> = {
  planning:    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  recording:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  on_hold:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}
const RESULT_KO: Record<string, string> = {
  success: '성공', failure: '실패', unclear: '애매함', pending: '보류',
}
const RESULT_CLS: Record<string, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  failure: 'text-red-500 dark:text-red-400',
  unclear: 'text-amber-500 dark:text-amber-400',
  pending: 'text-gray-400',
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function getPlatformLabel(t: CompareTest) {
  return t.platform === '기타' ? (t.customPlatform ?? t.platform) : t.platform
}

function getMetricLabel(t: CompareTest) {
  return t.primaryMetric === '기타' ? (t.customPrimaryMetric ?? t.primaryMetric) : t.primaryMetric
}

function getTypeLabel(t: CompareTest) {
  return t.testType === '기타' ? (t.customTestType ?? t.testType) : t.testType
}

function getSnap(snaps: Snapshot[], checkpoint: string): number | null {
  return snaps.find((s) => s.checkpoint === checkpoint)?.value ?? null
}

function calcChange(initial: number | null, current: number | null, dir: string) {
  if (initial === null || current === null) return null
  const raw = current - initial
  const pct = initial !== 0 ? (raw / initial) * 100 : null
  const isGood = dir === 'lower_better' ? raw < 0 : raw > 0
  return { raw, pct, isGood }
}

function getWinnerId(tests: CompareTest[], checkpoint: string): number | null {
  if (tests.length < 2) return null
  const dir = tests[0].metricDirection
  if (!tests.every((t) => t.metricDirection === dir)) return null
  const vals = tests
    .map((t) => ({ id: t.id, v: getSnap(t.snapshots, checkpoint) }))
    .filter((x): x is { id: number; v: number } => x.v !== null)
  if (vals.length < 2) return null
  const winner = dir === 'lower_better'
    ? vals.reduce((b, x) => x.v < b.v ? x : b)
    : vals.reduce((b, x) => x.v > b.v ? x : b)
  return winner.id
}

function fmtNum(v: number | null): string {
  if (v === null) return '—'
  return v.toLocaleString('ko-KR')
}

// ── 변화량 뱃지 ───────────────────────────────────────────────────────────────

function ChangeBadge({ initial, current, dir }: { initial: number | null; current: number | null; dir: string }) {
  const c = calcChange(initial, current, dir)
  if (!c) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
  return (
    <span className={`text-[11px] font-bold ${c.isGood ? 'text-emerald-600 dark:text-emerald-400' : c.raw === 0 ? 'text-gray-400' : 'text-red-500 dark:text-red-400'}`}>
      {c.raw > 0 ? '+' : ''}{fmtNum(c.raw)}
      {c.pct !== null && ` (${c.pct > 0 ? '+' : ''}${c.pct.toFixed(1)}%)`}
    </span>
  )
}

// ── 커스텀 툴팁 ───────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value?.toLocaleString('ko-KR')}</span>
        </p>
      ))}
    </div>
  )
}

// ── 테스트 선택 카드 ──────────────────────────────────────────────────────────

function TestSelectCard({
  test, selected, color, onToggle,
}: {
  test: CompareTest
  selected: boolean
  color: string | null
  onToggle: () => void
}) {
  const initial = getSnap(test.snapshots, 'initial')
  const after48h = getSnap(test.snapshots, 'after_48h')

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
        selected
          ? 'border-current bg-opacity-5'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
      }`}
      style={selected ? { borderColor: color!, backgroundColor: color! + '08' } : {}}
    >
      <div className="flex items-start gap-2.5">
        {/* 선택 표시 */}
        <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all ${
          selected ? 'border-transparent' : 'border-gray-300 dark:border-gray-600'
        }`} style={selected ? { backgroundColor: color! } : {}}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_CLS[test.status] ?? STATUS_CLS.planning}`}>
              {STATUS_KO[test.status] ?? test.status}
            </span>
            {test.resultStatus && (
              <span className={`text-[10px] font-bold ${RESULT_CLS[test.resultStatus] ?? ''}`}>
                {RESULT_KO[test.resultStatus]}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{test.title}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
            <span>{getPlatformLabel(test)}</span>
            <span>·</span>
            <span>{getMetricLabel(test)}</span>
            {initial !== null && (
              <>
                <span>·</span>
                <span>초기 {fmtNum(initial)}</span>
              </>
            )}
            {after48h !== null && (
              <span className={`font-semibold ${calcChange(initial, after48h, test.metricDirection)?.isGood ? 'text-emerald-500' : 'text-red-400'}`}>
                → {fmtNum(after48h)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── 비교 패널 ─────────────────────────────────────────────────────────────────

function ComparisonPanel({ tests }: { tests: CompareTest[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (tests.length < 2) return null

  const allSameMetric = tests.every((t) => t.primaryMetric === tests[0].primaryMetric)

  // 차트 데이터
  const chartData = CHECKPOINTS.map((cp) => {
    const point: Record<string, number | string | null> = { checkpoint: cp.label }
    tests.forEach((t, i) => {
      const v = getSnap(t.snapshots, cp.key)
      point[`T${i + 1}`] = v
    })
    return point
  })

  const hasChartData = tests.some((t) => t.snapshots.some((s) => s.value !== null))

  // 각 체크포인트의 winner
  const winner12h = getWinnerId(tests, 'after_12h')
  const winner48h = getWinnerId(tests, 'after_48h')

  return (
    <div className="space-y-4">
      {/* 다른 지표 경고 */}
      {!allSameMetric && (
        <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
          ⚠ 선택한 테스트들의 측정 지표가 다릅니다. 수치를 직접 비교할 때 주의가 필요합니다.
        </div>
      )}

      {/* 범례 */}
      <div className="flex flex-wrap gap-2">
        {tests.map((t, i) => (
          <div key={t.id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COMPARE_COLORS[i] }} />
            <span>T{i + 1}. {t.title.length > 20 ? t.title.slice(0, 20) + '…' : t.title}</span>
          </div>
        ))}
      </div>

      {/* 지표 추이 차트 */}
      {mounted && hasChartData && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">지표 추이 비교</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="checkpoint" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v?.toLocaleString('ko-KR')} width={60} />
              <Tooltip content={<ChartTooltip />} />
              {tests.map((t, i) => (
                <Line
                  key={t.id}
                  type="monotone"
                  dataKey={`T${i + 1}`}
                  name={`T${i + 1}. ${t.title.slice(0, 15)}`}
                  stroke={COMPARE_COLORS[i]}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: COMPARE_COLORS[i], strokeWidth: 2, stroke: '#fff' }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 비교 테이블 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">상세 비교</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide w-24">항목</th>
                {tests.map((t, i) => (
                  <th key={t.id} className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                        T{i + 1}. {t.title}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {/* 플랫폼 */}
              <TableRow label="플랫폼" cells={tests.map((t) => getPlatformLabel(t))} />
              {/* 테스트 유형 */}
              <TableRow label="유형" cells={tests.map((t) => getTypeLabel(t))} />
              {/* 대상 */}
              <TableRow label="대상" cells={tests.map((t) => t.targetName ?? '—')} />
              {/* 측정 지표 */}
              <TableRow label="지표" cells={tests.map((t) => getMetricLabel(t))} highlight />
              {/* 기간 */}
              <TableRow label="기간" cells={tests.map((t) =>
                t.startDate && t.endDate
                  ? `${t.startDate.slice(5)} ~ ${t.endDate.slice(5)}`
                  : t.startDate ? t.startDate.slice(5) + ' ~' : '—'
              )} />
              {/* 초기값 */}
              <tr>
                <td className="px-4 py-3 text-[11px] font-semibold text-gray-400">초기값</td>
                {tests.map((t, i) => {
                  const v = getSnap(t.snapshots, 'initial')
                  return (
                    <td key={t.id} className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{fmtNum(v)}</span>
                    </td>
                  )
                })}
              </tr>
              {/* 12h 후 */}
              <tr>
                <td className="px-4 py-3 text-[11px] font-semibold text-gray-400">12시간 후</td>
                {tests.map((t) => {
                  const v = getSnap(t.snapshots, 'after_12h')
                  const isWinner = winner12h === t.id && v !== null
                  return (
                    <td key={t.id} className={`px-4 py-3 ${isWinner ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{fmtNum(v)}</span>
                        {isWinner && <span title="최고 성과">🏆</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
              {/* 12h 변화 */}
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <td className="px-4 py-3 text-[11px] font-semibold text-gray-400 pl-6">└ 변화량</td>
                {tests.map((t) => (
                  <td key={t.id} className="px-4 py-3">
                    <ChangeBadge
                      initial={getSnap(t.snapshots, 'initial')}
                      current={getSnap(t.snapshots, 'after_12h')}
                      dir={t.metricDirection}
                    />
                  </td>
                ))}
              </tr>
              {/* 48h 후 */}
              <tr>
                <td className="px-4 py-3 text-[11px] font-semibold text-gray-400">48시간 후</td>
                {tests.map((t) => {
                  const v = getSnap(t.snapshots, 'after_48h')
                  const isWinner = winner48h === t.id && v !== null
                  return (
                    <td key={t.id} className={`px-4 py-3 ${isWinner ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{fmtNum(v)}</span>
                        {isWinner && <span title="최고 성과">🏆</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
              {/* 48h 변화 */}
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <td className="px-4 py-3 text-[11px] font-semibold text-gray-400 pl-6">└ 변화량</td>
                {tests.map((t) => (
                  <td key={t.id} className="px-4 py-3">
                    <ChangeBadge
                      initial={getSnap(t.snapshots, 'initial')}
                      current={getSnap(t.snapshots, 'after_48h')}
                      dir={t.metricDirection}
                    />
                  </td>
                ))}
              </tr>
              {/* 결과 */}
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 text-[11px] font-semibold text-gray-400">결과</td>
                {tests.map((t) => (
                  <td key={t.id} className="px-4 py-3">
                    {t.resultStatus ? (
                      <span className={`text-sm font-black ${RESULT_CLS[t.resultStatus] ?? 'text-gray-400'}`}>
                        {RESULT_KO[t.resultStatus]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 결과 요약 */}
      {tests.some((t) => t.resultSummary || t.analysisMemo) && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">결과 요약</h3>
          <div className="space-y-4">
            {tests.map((t, i) => (
              (t.resultSummary || t.analysisMemo) && (
                <div key={t.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">T{i + 1}. {t.title}</span>
                  </div>
                  {t.resultSummary && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-4 mb-1">{t.resultSummary}</p>
                  )}
                  {t.analysisMemo && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 ml-4 italic">{t.analysisMemo}</p>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TableRow({ label, cells, highlight }: { label: string; cells: string[]; highlight?: boolean }) {
  return (
    <tr>
      <td className="px-4 py-3 text-[11px] font-semibold text-gray-400">{label}</td>
      {cells.map((cell, i) => (
        <td key={i} className="px-4 py-3">
          <span className={`text-xs ${highlight ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {cell}
          </span>
        </td>
      ))}
    </tr>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function TestCompare({ tests }: { tests: CompareTest[] }) {
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const platforms = useMemo(() => {
    const set = new Set(tests.map(getPlatformLabel))
    return ['all', ...Array.from(set)]
  }, [tests])

  const filtered = useMemo(() =>
    tests.filter((t) => {
      if (filterPlatform !== 'all' && getPlatformLabel(t) !== filterPlatform) return false
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.targetName ?? '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [tests, filterPlatform, filterStatus, search])

  const selectedTests = useMemo(() =>
    selected.map((id) => tests.find((t) => t.id === id)!).filter(Boolean),
    [selected, tests])

  function toggleSelect(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  if (tests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="font-bold">비교할 테스트가 없습니다.</p>
          <p className="text-sm mt-1">테스트 관리에서 테스트를 먼저 추가해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">테스트 비교 분석</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              테스트를 2~5개 선택하면 성과를 나란히 비교합니다.
            </p>
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              선택 초기화
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex gap-6 max-w-7xl flex-col lg:flex-row">

          {/* ── 왼쪽: 필터 + 선택 목록 ── */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            {/* 필터 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4 space-y-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="테스트 제목·대상 검색..."
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors"
              />
              <div className="flex gap-2">
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-400 outline-none focus:border-teal-400"
                >
                  <option value="all">모든 플랫폼</option>
                  {platforms.slice(1).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-400 outline-none focus:border-teal-400"
                >
                  <option value="all">모든 상태</option>
                  {Object.entries(STATUS_KO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-gray-400">
                {filtered.length}개 테스트 · {selected.length}/5 선택됨
              </p>
            </div>

            {/* 테스트 목록 */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">검색 결과가 없습니다.</div>
              ) : (
                filtered.map((t, i) => {
                  const selectedIdx = selected.indexOf(t.id)
                  const isSelected = selectedIdx !== -1
                  const color = isSelected ? COMPARE_COLORS[selectedIdx] : null
                  const maxReached = !isSelected && selected.length >= 5

                  return (
                    <div key={t.id} className={maxReached ? 'opacity-40' : ''}>
                      <TestSelectCard
                        test={t}
                        selected={isSelected}
                        color={color}
                        onToggle={() => !maxReached && toggleSelect(t.id)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── 오른쪽: 비교 패널 ── */}
          <div className="flex-1 min-w-0">
            {selectedTests.length < 2 ? (
              <div className="h-full flex items-center justify-center py-20">
                <div className="text-center text-gray-400 dark:text-gray-500">
                  <svg className="w-14 h-14 mx-auto mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <p className="font-bold text-sm">
                    {selected.length === 0 ? '테스트를 2개 이상 선택하세요' : '하나 더 선택하면 비교가 시작됩니다'}
                  </p>
                  <p className="text-xs mt-1">최대 5개까지 동시 비교 가능</p>
                  {selected.length === 1 && (
                    <div className="mt-4 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLORS[0] }} />
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                        {selectedTests[0]?.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <ComparisonPanel tests={selectedTests} />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
