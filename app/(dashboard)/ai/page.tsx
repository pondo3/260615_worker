import ComingSoon from '@/components/ComingSoon'

export default function AiPage() {
  return (
    <ComingSoon
      stage={4}
      title="AI 분석"
      description="기록된 데이터를 바탕으로 AI가 개선 방향과 다음 액션을 추천합니다"
      features={['오늘 할 일 추천', '목표 개선 방향 추천', '루틴 실패 원인 분석', '테스트 결과 요약', '다음 액션 추천', '생산성 패턴 학습', '맞춤형 인사이트', '자연어 질문 응답']}
      icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
    />
  )
}
