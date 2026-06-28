'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { TimeBlockWithRefs } from '@/app/actions/timeblocks'
import { calcDurationMin, toggleTimeBlockDone, deleteTimeBlock } from '@/app/actions/timeblocks'

const HOUR_HEIGHT = 64   // px per hour
const START_HOUR = 6     // 06:00부터 시작
const END_HOUR = 24      // 24:00까지

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT
}

function yToTime(y: number, snap = 15): string {
  const totalMin = Math.round((y / HOUR_HEIGHT * 60 + START_HOUR * 60) / snap) * snap
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(Math.min(h, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 겹치는 블록을 열(column)로 배치
function layoutBlocks(blocks: TimeBlockWithRefs[]) {
  type Lane = { end: number }
  const lanes: Lane[] = []
  const result: { block: TimeBlockWithRefs; col: number; cols: number }[] = []

  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime))

  for (const block of sorted) {
    const startMin = block.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
    const endMin = block.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m)

    let col = 0
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].end <= startMin) { col = i; break }
      if (i === lanes.length - 1) col = i + 1
    }
    if (lanes[col]) lanes[col].end = endMin
    else lanes.push({ end: endMin })

    result.push({ block, col, cols: 0 })
  }

  // 각 블록이 겹치는 최대 열 수 계산
  for (const item of result) {
    const startMin = item.block.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
    const endMin = item.block.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
    let maxCol = item.col
    for (const other of result) {
      const oStart = other.block.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
      const oEnd = other.block.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
      if (oStart < endMin && oEnd > startMin) {
        maxCol = Math.max(maxCol, other.col)
      }
    }
    item.cols = maxCol + 1
  }

  return result
}

type Props = {
  date: string
  blocks: TimeBlockWithRefs[]
  weekBlocks: TimeBlockWithRefs[]
  weekStart: string
  onEdit: (b: TimeBlockWithRefs) => void
  onCreateAt: (time?: { startTime: string; endTime: string }) => void
  onRefresh: () => void
}

export default function TodayView({ date, blocks, weekBlocks, weekStart, onEdit, onCreateAt, onRefresh }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [nowY, setNowY] = useState<number | null>(null)
  const [clickGuide, setClickGuide] = useState<{ y: number; time: string } | null>(null)

  // 현재 시각 인디케이터
  useEffect(() => {
    function update() {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      if (h >= START_HOUR && h < END_HOUR) {
        setNowY(((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT)
      }
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  // 타임라인 클릭 → 시간 위치 가이드
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const time = yToTime(y)
    const [h, m] = time.split(':').map(Number)
    const endH = m + 60 >= 60 ? h + 1 : h
    const endM = (m + 60) % 60
    const endTime = `${String(Math.min(endH, 23)).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
    onCreateAt({ startTime: time, endTime })
  }, [onCreateAt])

  const handleTimelineMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    setClickGuide({ y, time: yToTime(y) })
  }, [])

  const laid = layoutBlocks(blocks)

  // 주간 미니 뷰 데이터
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dayStr = d.toISOString().split('T')[0]
    const dayBlocks = weekBlocks.filter((b) => b.date === dayStr)
    return {
      label: ['월', '화', '수', '목', '금', '토', '일'][i],
      date: dayStr,
      blocks: dayBlocks,
      isToday: dayStr === new Date().toISOString().split('T')[0],
      isSelected: dayStr === date,
    }
  })

  async function handleToggle(id: number) {
    await toggleTimeBlockDone(id)
    onRefresh()
  }

  async function handleDelete(id: number) {
    if (!confirm('삭제할까요?')) return
    await deleteTimeBlock(id)
    onRefresh()
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ── 타임라인 ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-w-0">
          {/* 시간 레이블 */}
          <div className="flex-shrink-0 w-14 select-none">
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
              const h = START_HOUR + i
              return (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2"
                  style={{ height: h < END_HOUR ? HOUR_HEIGHT : 0 }}
                >
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono -translate-y-2">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              )
            })}
          </div>

          {/* 타임라인 그리드 + 블록 */}
          <div
            ref={timelineRef}
            className="flex-1 relative cursor-crosshair select-none"
            style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={() => setClickGuide(null)}
          >
            {/* 시간 구분선 */}
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                style={{ top: i * HOUR_HEIGHT }}
              />
            ))}
            {/* 30분 구분선 */}
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div
                key={`half-${i}`}
                className="absolute left-0 right-0 border-t border-dashed border-gray-50 dark:border-gray-800/50"
                style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* 현재 시각 선 */}
            {nowY !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: nowY }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                  <div className="flex-1 h-px bg-red-400" />
                </div>
              </div>
            )}

            {/* 마우스 가이드 */}
            {clickGuide && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: clickGuide.y }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-1 rounded -translate-y-2">
                    {clickGuide.time}
                  </span>
                  <div className="flex-1 h-px border-t border-dashed border-blue-300 dark:border-blue-700" />
                </div>
              </div>
            )}

            {/* 시간 블록 */}
            <div className="absolute inset-0 pointer-events-none">
              {laid.map(({ block: b, col, cols }) => {
                const top = timeToY(b.startTime)
                const height = Math.max(timeToY(b.endTime) - top, 20)
                const width = `calc((100% - 8px) / ${cols})`
                const left = `calc((100% - 8px) / ${cols} * ${col})`
                const dur = calcDurationMin(b.startTime, b.endTime)
                const isDone = b.status === 'done'

                return (
                  <div
                    key={b.id}
                    className="absolute rounded-lg cursor-pointer pointer-events-auto group transition-all hover:z-30 hover:shadow-lg"
                    style={{
                      top,
                      height,
                      left,
                      width,
                      backgroundColor: isDone ? '#9CA3AF' : b.color,
                      opacity: isDone ? 0.6 : 1,
                      padding: '3px 6px',
                      border: `1px solid ${isDone ? '#9CA3AF' : b.color}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onEdit(b) }}
                  >
                    <div className="flex items-start justify-between h-full min-h-0">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-white text-[11px] font-semibold leading-tight truncate">
                          {isDone && '✓ '}{b.title}
                        </p>
                        {height > 32 && (
                          <p className="text-white/80 text-[10px] mt-0.5">
                            {b.startTime}–{b.endTime}
                            {dur >= 60 && ` (${Math.floor(dur / 60)}h${dur % 60 > 0 ? `${dur % 60}m` : ''})`}
                          </p>
                        )}
                        {height > 48 && b.project && (
                          <p className="text-white/70 text-[10px] truncate mt-0.5">📁 {b.project.title}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(b.id) }}
                          className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 flex items-center justify-center"
                          title={isDone ? '미완료로 변경' : '완료'}
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(b.id) }}
                          className="w-5 h-5 rounded bg-white/20 hover:bg-red-400 flex items-center justify-center"
                          title="삭제"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 주간 미니뷰 + 다음 일정 ── */}
      <div className="w-56 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-900">
        {/* 주간 미니 */}
        <div className="p-3">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">이번 주 계획</p>
          <div className="flex gap-1">
            {weekDays.map((day) => {
              const totalMin = day.blocks.reduce((s, b) => s + calcDurationMin(b.startTime, b.endTime), 0)
              const doneMin = day.blocks.filter((b) => b.status === 'done')
                .reduce((s, b) => s + calcDurationMin(b.startTime, b.endTime), 0)
              const pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0

              return (
                <div key={day.date} className="flex-1 text-center">
                  <p className={`text-[10px] font-semibold mb-1 ${
                    day.isToday ? 'text-blue-600 dark:text-blue-400' :
                    day.isSelected ? 'text-indigo-500' : 'text-gray-400'
                  }`}>{day.label}</p>
                  <div className="relative h-16 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {day.blocks.length > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t"
                        style={{
                          height: `${Math.max(10, Math.min(100, totalMin / 4))}%`,
                          backgroundColor: day.isToday ? '#3B82F6' : '#8B5CF6',
                          opacity: 0.7,
                        }}
                      />
                    )}
                    {pct > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t"
                        style={{
                          height: `${Math.max(4, Math.min(100, totalMin / 4) * pct / 100)}%`,
                          backgroundColor: '#10B981',
                          opacity: 0.9,
                        }}
                      />
                    )}
                    {day.isToday && (
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
                    )}
                  </div>
                  {totalMin > 0 && (
                    <p className="text-[9px] text-gray-400 mt-0.5">{pct}%</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* 주간 요약 */}
          {(() => {
            const totalMin = weekBlocks.reduce((s, b) => s + calcDurationMin(b.startTime, b.endTime), 0)
            const doneMin = weekBlocks.filter((b) => b.status === 'done').reduce((s, b) => s + calcDurationMin(b.startTime, b.endTime), 0)
            const h = Math.floor(totalMin / 60)
            const dh = Math.floor(doneMin / 60)
            const pct = totalMin > 0 ? Math.round(doneMin / totalMin * 100) : 0
            return (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-500 mb-1">
                  주간 계획 <span className="font-bold text-gray-700 dark:text-gray-300">{h}h</span> · 완료 <span className="font-bold text-emerald-600">{dh}h</span> ({pct}%)
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}
        </div>

        {/* 다음 일정 */}
        <div className="px-3 pb-3">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">다음 블록</p>
          {(() => {
            const now = new Date()
            const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            const upcoming = blocks.filter((b) => b.startTime > nowStr && b.status !== 'done').slice(0, 3)
            if (upcoming.length === 0) {
              return <p className="text-[11px] text-gray-400 dark:text-gray-600">오늘 남은 블록 없음</p>
            }
            return (
              <div className="space-y-2">
                {upcoming.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onEdit(b)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">{b.title}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 pl-3.5">{b.startTime} · {b.blockType}</p>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>

        {/* 시간 분석 요약 */}
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-3 mb-2">유형별 분포</p>
          {(() => {
            const typeMap: Record<string, number> = {}
            for (const b of blocks) {
              typeMap[b.blockType] = (typeMap[b.blockType] ?? 0) + calcDurationMin(b.startTime, b.endTime)
            }
            const entries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
            const total = entries.reduce((s, [, v]) => s + v, 0)
            if (entries.length === 0) return <p className="text-[11px] text-gray-400">데이터 없음</p>
            return (
              <div className="space-y-1.5">
                {entries.map(([type, min]) => (
                  <div key={type}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-600 dark:text-gray-400 truncate">{type}</span>
                      <span className="text-gray-400 flex-shrink-0 ml-1">
                        {Math.floor(min / 60) > 0 ? `${Math.floor(min / 60)}h ` : ''}{min % 60}m
                      </span>
                    </div>
                    <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.round((min / total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
