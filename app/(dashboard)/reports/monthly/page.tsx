import { getAnalysisData } from '@/app/actions/analysis'
import MonthlyReport from '@/components/reports/MonthlyReport'

type SearchParams = Promise<{ month?: string }>

function parseMonth(month: string | undefined): { year: number; month: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    return { year: y, month: m }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default async function MonthlyReportPage({ searchParams }: { searchParams: SearchParams }) {
  const { month: monthParam } = await searchParams
  const { year, month } = parseMonth(monthParam)

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0) // last day of month
  const today = new Date()

  const effectiveTo = to > today ? today : to

  const data = await getAnalysisData(
    from.toISOString().split('T')[0],
    effectiveTo.toISOString().split('T')[0],
  )

  return (
    <MonthlyReport
      data={data}
      year={year}
      month={month}
      fromDate={from.toISOString().split('T')[0]}
      toDate={effectiveTo.toISOString().split('T')[0]}
    />
  )
}
