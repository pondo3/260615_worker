export function calcDurationMin(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
}

export const BLOCK_TYPES = [
  '업무', '개인', '루틴', '프로젝트', '콘텐츠 제작',
  '블로그 작업', '유튜브 작업', '개발 작업', '휴식', '기타',
] as const

export const BLOCK_TYPE_COLORS: Record<string, string> = {
  '업무': '#3B82F6',
  '개인': '#10B981',
  '루틴': '#F59E0B',
  '프로젝트': '#8B5CF6',
  '콘텐츠 제작': '#EF4444',
  '블로그 작업': '#EC4899',
  '유튜브 작업': '#F97316',
  '개발 작업': '#6366F1',
  '휴식': '#6B7280',
  '기타': '#64748B',
}
