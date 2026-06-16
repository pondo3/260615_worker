import { getAnalysisData } from '@/app/actions/analysis'
import AutoReportClient from '@/components/reports/AutoReportClient'
import { formatDate, parseDateParam, getWeekRange, getMonthRange } from '@/lib/reportPeriods'

type SearchParams = Promise<{ type?: string; date?: string }>

export default async function AutoReportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const type = params.type === 'month' ? 'month' : 'week'
  const anchor = parseDateParam(params.date)

  const { start, end } = type === 'month' ? getMonthRange(anchor) : getWeekRange(anchor)
  const today = new Date()
  const effectiveEnd = end > today ? today : end

  const data = await getAnalysisData(formatDate(start), formatDate(effectiveEnd))

  return (
    <AutoReportClient
      type={type}
      data={data}
      anchorDate={formatDate(anchor)}
      rangeStart={formatDate(start)}
      rangeEnd={formatDate(end)}
    />
  )
}
