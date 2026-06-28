'use client'

import { useActionState, useEffect, useState } from 'react'
import { createTest, updateTest } from '@/app/actions/tests'
import { fetchUrlMetadata, translateToKorean } from '@/app/actions/materials'

type Link = { label: string; url: string; memo: string }
type Snapshot = { checkpoint: 'initial' | 'after_12h' | 'after_48h'; value: string; memo: string }

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
  links: Link[]
  snapshots: Snapshot[]
}

type Props = { onClose: () => void; test?: Test }

const PLATFORMS = ['유튜브', '네이버 블로그', '인스타그램', '틱톡', '웹사이트', '광고', '스마트스토어', '플레이스', '기타']
const TEST_TYPES = ['제목 테스트', '썸네일 테스트', '첫 문장 테스트', '대본 구조 테스트', '업로드 시간 테스트', '키워드 테스트', '해시태그 테스트', '링크 테스트', '광고 문구 테스트', '상세페이지 테스트', '버튼 문구 테스트', '가격 테스트', '콘텐츠 주제 테스트', '기타']
const METRICS = ['조회수', '클릭수', '클릭률', '노출수', '좋아요 수', '댓글 수', '공유 수', '저장 수', '순위', '문의 수', '구매 수', '전환율', '체류시간', '기타']

const STATUS_OPTIONS = [
  { value: 'planning',    label: '계획중',      cls: 'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  { value: 'in_progress', label: '진행중',      cls: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { value: 'recording',   label: '결과입력중',  cls: 'border-violet-300 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400' },
  { value: 'completed',   label: '완료',        cls: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  { value: 'on_hold',     label: '보류',        cls: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
]
const RESULT_OPTIONS = [
  { value: 'success', label: '성공', cls: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  { value: 'failure', label: '실패', cls: 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
  { value: 'unclear', label: '애매함', cls: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
  { value: 'pending', label: '보류', cls: 'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
]

const CHECKPOINTS: { key: 'initial' | 'after_12h' | 'after_48h'; label: string }[] = [
  { key: 'initial',   label: '등록 시점' },
  { key: 'after_12h', label: '12시간 후' },
  { key: 'after_48h', label: '48시간 후' },
]

function TextArea({ label, value, onChange, placeholder, rows = 3, required = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors resize-none"
      />
    </div>
  )
}

export default function TestModal({ onClose, test }: Props) {
  const isEdit = !!test
  const action = isEdit ? updateTest : createTest
  const [state, formAction, pending] = useActionState(action, undefined)
  const [tab, setTab] = useState<'plan' | 'result'>('plan')

  // 계획 탭 상태 (모두 controlled)
  const [title, setTitle] = useState(test?.title ?? '')
  const [platform, setPlatform] = useState(test?.platform ?? '유튜브')
  const [customPlatform, setCustomPlatform] = useState(test?.customPlatform ?? '')
  const [testType, setTestType] = useState(test?.testType ?? '제목 테스트')
  const [customTestType, setCustomTestType] = useState(test?.customTestType ?? '')
  const [targetName, setTargetName] = useState(test?.targetName ?? '')
  const [startDate, setStartDate] = useState(test?.startDate ?? '')
  const [endDate, setEndDate] = useState(test?.endDate ?? '')
  const [links, setLinks] = useState<Link[]>(test?.links ?? [])
  const [linkFetching, setLinkFetching] = useState<Record<number, boolean>>({})
  const [purpose, setPurpose] = useState(test?.purpose ?? '')
  const [hypothesis, setHypothesis] = useState(test?.hypothesis ?? '')
  const [method, setMethod] = useState(test?.method ?? '')
  const [conditions, setConditions] = useState(test?.conditions ?? '')
  const [successCriteria, setSuccessCriteria] = useState(test?.successCriteria ?? '')
  const [preMemo, setPreMemo] = useState(test?.preMemo ?? '')

  // 결과 탭 상태
  const [primaryMetric, setPrimaryMetric] = useState(test?.primaryMetric ?? '조회수')
  const [customMetric, setCustomMetric] = useState(test?.customPrimaryMetric ?? '')
  const [metricDir, setMetricDir] = useState<'higher_better' | 'lower_better'>(
    (test?.metricDirection as 'higher_better' | 'lower_better') ?? 'higher_better'
  )
  const [status, setStatus] = useState(test?.status ?? 'planning')
  const [resultStatus, setResultStatus] = useState(test?.resultStatus ?? '')
  const [snapshots, setSnapshots] = useState<Snapshot[]>(
    CHECKPOINTS.map((c) => {
      const existing = test?.snapshots.find((s) => s.checkpoint === c.key)
      return { checkpoint: c.key, value: existing?.value?.toString() ?? '', memo: existing?.memo ?? '' }
    })
  )
  const [resultSummary, setResultSummary] = useState(test?.resultSummary ?? '')
  const [analysisMemo, setAnalysisMemo] = useState(test?.analysisMemo ?? '')
  const [nextAction, setNextAction] = useState(test?.nextAction ?? '')

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function addLink() { setLinks((prev) => [...prev, { label: '', url: '', memo: '' }]) }
  function removeLink(i: number) { setLinks((prev) => prev.filter((_, idx) => idx !== i)) }
  function updateLink(i: number, field: keyof Link, val: string) {
    setLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }
  async function handleUrlBlur(i: number, url: string) {
    if (!url.trim() || !/youtu(\.be|be\.com)/.test(url)) return
    if (links[i].label.trim()) return  // 이미 라벨이 있으면 덮어쓰지 않음
    setLinkFetching((prev) => ({ ...prev, [i]: true }))
    try {
      const meta = await fetchUrlMetadata(url.trim())
      if (meta.originalTitle) {
        const translated = await translateToKorean(meta.originalTitle)
        updateLink(i, 'label', translated ?? meta.originalTitle)
      }
    } finally {
      setLinkFetching((prev) => ({ ...prev, [i]: false }))
    }
  }
  function updateSnapshot(i: number, field: 'value' | 'memo', val: string) {
    setSnapshots((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  const errors = state && 'errors' in state ? state.errors : {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl bg-orange-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '테스트 수정' : '새 테스트'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {([['plan', '계획'], ['result', '결과']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                tab === key ? 'border-b-2 border-orange-500 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* hidden 입력: form 바깥에 두어 footer가 항상 보이도록 분리 */}
        <form id="test-form" action={formAction}>
          {isEdit && <input type="hidden" name="id" value={test.id} />}
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="platform" value={platform} />
          <input type="hidden" name="customPlatform" value={customPlatform} />
          <input type="hidden" name="testType" value={testType} />
          <input type="hidden" name="customTestType" value={customTestType} />
          <input type="hidden" name="targetName" value={targetName} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />
          <input type="hidden" name="purpose" value={purpose} />
          <input type="hidden" name="hypothesis" value={hypothesis} />
          <input type="hidden" name="method" value={method} />
          <input type="hidden" name="conditions" value={conditions} />
          <input type="hidden" name="successCriteria" value={successCriteria} />
          <input type="hidden" name="preMemo" value={preMemo} />
          <input type="hidden" name="links" value={JSON.stringify(links)} />
          <input type="hidden" name="primaryMetric" value={primaryMetric} />
          <input type="hidden" name="customPrimaryMetric" value={customMetric} />
          <input type="hidden" name="metricDirection" value={metricDir} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="resultStatus" value={resultStatus} />
          <input type="hidden" name="resultSummary" value={resultSummary} />
          <input type="hidden" name="analysisMemo" value={analysisMemo} />
          <input type="hidden" name="nextAction" value={nextAction} />
          <input type="hidden" name="snapshots" value={JSON.stringify(snapshots)} />
        </form>

        {/* 탭 콘텐츠 - 별도 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto">

          {/* ─ 계획 탭 ─ */}
          <div className={`px-6 py-5 space-y-5 ${tab === 'plan' ? '' : 'hidden'}`}>
            {/* 테스트명 */}
            <div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="테스트 이름 *"
                className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-orange-400 pb-2 transition-colors"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
            </div>

            {/* 플랫폼 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">플랫폼</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PLATFORMS.map((p) => (
                  <button key={p} type="button" onClick={() => setPlatform(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      platform === p ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
              {platform === '기타' && (
                <input value={customPlatform} onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="플랫폼 직접 입력"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors" />
              )}
            </div>

            {/* 테스트 유형 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">테스트 유형</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TEST_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setTestType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      testType === t ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              {testType === '기타' && (
                <input value={customTestType} onChange={(e) => setCustomTestType(e.target.value)}
                  placeholder="유형 직접 입력"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors" />
              )}
            </div>

            {/* 대상명 + 기간 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">테스트 대상명</label>
                <input value={targetName} onChange={(e) => setTargetName(e.target.value)}
                  placeholder="예: 쇼츠 A안 제목"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">테스트 기간</label>
                <div className="flex items-center gap-1">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-orange-400 transition-colors" />
                  <span className="text-gray-300 dark:text-gray-600 text-xs">~</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-orange-400 transition-colors" />
                </div>
              </div>
            </div>

            {/* 링크 등록 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">링크 등록</label>
                <button type="button" onClick={addLink}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  링크 추가
                </button>
              </div>
              <div className="space-y-3">
                {links.map((link, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
                    {/* URL 먼저 입력 → blur 시 YouTube면 제목 자동 fetch */}
                    <input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)}
                      onBlur={(e) => handleUrlBlur(i, e.target.value)}
                      placeholder="URL (YouTube 링크 입력 시 제목 자동 완성)"
                      className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 outline-none focus:border-orange-400 transition-colors" />
                    <div className="flex items-center gap-2">
                      <input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)}
                        placeholder={linkFetching[i] ? '제목 가져오는 중...' : '링크명'}
                        disabled={linkFetching[i]}
                        className="flex-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 outline-none focus:border-orange-400 transition-colors disabled:opacity-60" />
                      <button type="button" onClick={() => removeLink(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <input value={link.memo} onChange={(e) => updateLink(i, 'memo', e.target.value)}
                      placeholder="메모 (선택)"
                      className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 outline-none focus:border-orange-400 transition-colors" />
                  </div>
                ))}
                {links.length === 0 && (
                  <button type="button" onClick={addLink}
                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    + 링크 추가하기
                  </button>
                )}
              </div>
            </div>

            <TextArea label="목적" value={purpose} onChange={setPurpose} placeholder="이 테스트를 왜 진행하는지 작성하세요" rows={2} />
            <TextArea label="가설" value={hypothesis} onChange={setHypothesis} placeholder="테스트 전에 예상하는 결과는?" rows={2} />
            <TextArea label="테스트 방법" value={method} onChange={setMethod} placeholder="어떤 방식으로 테스트할지 작성하세요" rows={2} />
            <TextArea label="테스트 조건 / 환경" value={conditions} onChange={setConditions} placeholder="업로드 시간, 해시태그 수, 예산 등 조건을 기록하세요" rows={3} />
            <TextArea label="성공 기준" value={successCriteria} onChange={setSuccessCriteria} placeholder="어떤 수치가 나오면 성공인지 작성하세요" rows={2} />
            <TextArea label="사전 메모" value={preMemo} onChange={setPreMemo} placeholder="테스트 전에 남겨둘 참고 내용" rows={2} />
          </div>

          {/* ─ 결과 탭 ─ */}
          <div className={`px-6 py-5 space-y-5 ${tab === 'result' ? '' : 'hidden'}`}>
            {/* 주요 지표 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">주요 지표</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {METRICS.map((m) => (
                  <button key={m} type="button" onClick={() => setPrimaryMetric(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      primaryMetric === m ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
              {primaryMetric === '기타' && (
                <input value={customMetric} onChange={(e) => setCustomMetric(e.target.value)}
                  placeholder="지표 직접 입력"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors mb-2" />
              )}
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">지표 방향:</label>
                {[{ value: 'higher_better', label: '↑ 높을수록 좋음' }, { value: 'lower_better', label: '↓ 낮을수록 좋음' }].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setMetricDir(opt.value as typeof metricDir)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      metricDir === opt.value ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 수치 입력 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">수치 입력</label>
              <div className="space-y-3">
                {CHECKPOINTS.map((cp, i) => (
                  <div key={cp.key} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-20 flex-shrink-0">{cp.label}</span>
                      <input
                        type="number"
                        value={snapshots[i].value}
                        onChange={(e) => updateSnapshot(i, 'value', e.target.value)}
                        placeholder="값 입력"
                        step="any"
                        className="flex-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <input
                      value={snapshots[i].memo}
                      onChange={(e) => updateSnapshot(i, 'memo', e.target.value)}
                      placeholder="메모 (선택)"
                      className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 outline-none focus:border-orange-400 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 결과 판정 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">결과 판정</label>
              <div className="grid grid-cols-4 gap-2">
                {RESULT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setResultStatus(resultStatus === opt.value ? '' : opt.value)}
                    className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      resultStatus === opt.value ? opt.cls + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 상태 (수정 시에만) */}
            {isEdit && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">상태</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        status === opt.value ? opt.cls + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <TextArea label="결과 요약" value={resultSummary} onChange={setResultSummary} placeholder="테스트 결과를 짧게 정리하세요" rows={2} />
            <TextArea label="분석 메모" value={analysisMemo} onChange={setAnalysisMemo} placeholder="결과에 대한 원인 분석을 기록하세요" rows={3} />
            <TextArea label="다음 테스트 개선안" value={nextAction} onChange={setNextAction} placeholder="다음에 바꿔볼 내용을 작성하세요" rows={2} />

            {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}
          </div>
        </div>

        {/* Footer - form 바깥에서 항상 보이도록 고정 */}
        <div className="flex-shrink-0 px-6 pb-5 pt-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            취소
          </button>
          <button type="submit" form="test-form" disabled={pending}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50">
            {pending ? '저장 중...' : isEdit ? '수정 완료' : '테스트 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
