import { getAnalysisData } from '@/app/actions/analysis'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'

function getThisMonthRange(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  }
}

export default async function AnalysisPage() {
  const { from, to } = getThisMonthRange()
  const initialData = await getAnalysisData(from, to)

  return (
    <AnalysisDashboard
      initialData={initialData}
      initialPeriod="month"
      initialFrom={from}
      initialTo={to}
    />
  )
}
