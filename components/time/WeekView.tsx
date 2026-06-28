'use client'

import type { TimeBlockWithRefs } from '@/app/actions/timeblocks'
import { calcDurationMin } from '@/app/actions/timeblocks'

const HOUR_HEIGHT = 48
const START_HOUR = 7
const END_HOUR = 23

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT
}

type Props = {
  weekStart: string
  blocks: TimeBlockWithRefs[]
  selectedDate: string
  onEdit: (b: TimeBlockWithRefs) => void
  onSelectDate: (date: string) => void
  onCreateAt: (date: string, time: { startTime: string; endTime: string }) => void
}

export default function WeekView({ weekStart, blocks, selectedDate, onEdit, onSelectDate, onCreateAt }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return {
      label: ['월', '화', '수', '목', '금', '토', '일'][i],
      num: d.getDate(),
      date: dateStr,
      isToday: dateStr === today,
      isSelected: dateStr === selectedDate,
      dayBlocks: blocks.filter((b) => b.date === dateStr),
    }
  })

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 요일 헤더 */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="w-12 flex-shrink-0" />
        {weekDays.map((day) => (
          <div
            key={day.date}
            onClick={() => onSelectDate(day.date)}
            className="flex-1 text-center py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l border-gray-100 dark:border-gray-800"
          >
            <p className={`text-xs font-semibold ${
              day.isToday ? 'text-blue-600 dark:text-blue-400' :
              ['토', '일'].includes(day.label) ? 'text-red-400' :
              'text-gray-500 dark:text-gray-400'
            }`}>{day.label}</p>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 text-sm font-bold ${
              day.isToday
                ? 'bg-blue-500 text-white'
                : day.isSelected
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {day.num}
            </div>
            <p className="text-[9px] text-gray-400 mt-0.5">{day.dayBlocks.length}개</p>
          </div>
        ))}
      </div>

      {/* 타임그리드 */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <div className="flex" style={{ height: hours.length * HOUR_HEIGHT }}>
          {/* 시간 레이블 */}
          <div className="w-12 flex-shrink-0 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="text-[9px] text-gray-400 font-mono -translate-y-1.5">
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* 각 요일 컬럼 */}
          {weekDays.map((day) => (
            <div
              key={day.date}
              className="flex-1 border-l border-gray-100 dark:border-gray-800 relative cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const totalMin = Math.round((y / HOUR_HEIGHT * 60 + START_HOUR * 60) / 15) * 15
                const h = Math.floor(totalMin / 60)
                const m = totalMin % 60
                const startTime = `${String(Math.min(h, 22)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                const endH = Math.min(h + 1, 23)
                const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                onCreateAt(day.date, { startTime, endTime })
              }}
            >
              {/* 시간 구분선 */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                />
              ))}

              {/* 오늘 배경 */}
              {day.isToday && (
                <div className="absolute inset-0 bg-blue-50/30 dark:bg-blue-900/10 pointer-events-none" />
              )}

              {/* 블록 */}
              {day.dayBlocks.map((b) => {
                const top = timeToY(b.startTime)
                const height = Math.max(timeToY(b.endTime) - top, 16)
                const dur = calcDurationMin(b.startTime, b.endTime)
                const isDone = b.status === 'done'

                return (
                  <div
                    key={b.id}
                    className="absolute left-0.5 right-0.5 rounded cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      top,
                      height,
                      backgroundColor: isDone ? '#9CA3AF' : b.color,
                      opacity: isDone ? 0.6 : 0.9,
                      padding: '1px 3px',
                    }}
                    onClick={(e) => { e.stopPropagation(); onEdit(b) }}
                  >
                    <p className="text-white text-[9px] font-semibold truncate leading-tight">
                      {isDone && '✓ '}{b.title}
                    </p>
                    {height > 28 && (
                      <p className="text-white/70 text-[8px]">
                        {b.startTime} ({dur >= 60 ? `${Math.floor(dur / 60)}h` : `${dur}m`})
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 주간 요약 푸터 */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2">
        <div className="flex gap-2">
          <div className="w-12 flex-shrink-0" />
          {weekDays.map((day) => {
            const totalMin = day.dayBlocks.reduce((s, b) => s + calcDurationMin(b.startTime, b.endTime), 0)
            const doneMin = day.dayBlocks.filter((b) => b.status === 'done').reduce((s, b) => s + calcDurationMin(b.startTime, b.endTime), 0)
            const h = Math.floor(totalMin / 60)
            const pct = totalMin > 0 ? Math.round(doneMin / totalMin * 100) : 0
            return (
              <div key={day.date} className="flex-1 text-center border-l border-gray-100 dark:border-gray-800">
                {totalMin > 0 ? (
                  <>
                    <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{h}h{totalMin % 60 > 0 ? `${totalMin % 60}m` : ''}</p>
                    <p className="text-[9px] text-emerald-600">{pct}%</p>
                  </>
                ) : (
                  <p className="text-[10px] text-gray-300 dark:text-gray-700">—</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
