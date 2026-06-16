'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createApiKey,
  deleteApiKey,
  toggleApiKeyActive,
  resetApiKeyQuota,
  updateApiKeyMeta,
  testApiKey,
} from '@/app/actions/api-keys'

type ApiKeyItem = {
  id: number
  service: string
  label: string
  maskedKey: string
  isActive: boolean
  quotaExceeded: boolean
  lastUsedAt: string | null
  lastError: string | null
  sortOrder: number
  createdAt: string
}

type Props = { apiKeys: ApiKeyItem[] }

const SERVICE_LABELS: Record<string, string> = {
  youtube: 'YouTube Data API v3',
}

const SERVICE_COLORS: Record<string, string> = {
  youtube: 'bg-red-500',
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  youtube: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function StatusBadge({ isActive, quotaExceeded }: { isActive: boolean; quotaExceeded: boolean }) {
  if (!isActive) {
    return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">비활성</span>
  }
  if (quotaExceeded) {
    return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">할당량 초과</span>
  }
  return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">활성</span>
}

function AddKeyForm({ service, onDone }: { service: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createApiKey, undefined)
  const [label, setLabel] = useState('')
  const [keyValue, setKeyValue] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [showKey, setShowKey] = useState(false)

  const errors = state && 'errors' in state ? state.errors : {}

  if (state && 'success' in state && state.success) {
    onDone()
  }

  return (
    <form action={formAction} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700 mt-3">
      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">새 API 키 추가</p>

      <input type="hidden" name="service" value={service} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="keyValue" value={keyValue} />
      <input type="hidden" name="sortOrder" value={sortOrder} />

      <div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="이름 (예: 메인키, 백업키 1) *"
          className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors"
        />
        {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label[0]}</p>}
      </div>

      <div className="relative">
        <input
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          type={showKey ? 'text' : 'password'}
          placeholder="API 키 값 *"
          className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 pr-10 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors font-mono"
        />
        <button type="button" onClick={() => setShowKey(!showKey)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          {showKey ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          )}
        </button>
        {errors.keyValue && <p className="text-xs text-red-500 mt-1">{errors.keyValue[0]}</p>}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">우선순위</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          min="0"
          className="w-20 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors"
        />
        <p className="text-[10px] text-gray-400">낮을수록 먼저 사용</p>
      </div>

      {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          취소
        </button>
        <button type="submit" disabled={pending}
          className="flex-1 py-2 rounded-lg bg-teal-500 text-xs font-bold text-white hover:bg-teal-600 transition-colors disabled:opacity-50">
          {pending ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  )
}

function KeyRow({ item }: { item: ApiKeyItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(item.label)
  const [editSortOrder, setEditSortOrder] = useState(String(item.sortOrder))
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  function run(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const result = await testApiKey(item.id)
    setTestResult(result)
    setTesting(false)
    router.refresh()
  }

  async function handleSaveEdit() {
    await updateApiKeyMeta(item.id, editLabel, Number(editSortOrder))
    setEditing(false)
    router.refresh()
  }

  const opacity = isPending ? 'opacity-50 pointer-events-none' : ''

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-opacity ${opacity}`}>
      <div className="p-4">
        {/* 헤더 행 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 text-sm font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white outline-none focus:border-teal-400"
                />
                <input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  min="0"
                  className="w-16 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400"
                  title="우선순위"
                />
                <button onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-lg bg-teal-500 text-xs font-bold text-white hover:bg-teal-600">
                  저장
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{item.label}</p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  우선순위 {item.sortOrder}
                </span>
              </div>
            )}
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{item.maskedKey}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge isActive={item.isActive} quotaExceeded={item.quotaExceeded} />
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500 mb-3">
          <span>마지막 사용: {formatDate(item.lastUsedAt)}</span>
          <span>등록: {formatDate(item.createdAt)}</span>
        </div>

        {/* 에러 메시지 */}
        {item.lastError && (
          <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/50">
            <p className="text-xs text-amber-700 dark:text-amber-400">{item.lastError}</p>
          </div>
        )}

        {/* 테스트 결과 */}
        {testResult && (
          <div className={`mb-3 px-3 py-2 rounded-lg border text-xs ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
          }`}>
            {testResult.success ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 테스트 */}
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            테스트
          </button>

          {/* 활성/비활성 토글 */}
          <button
            onClick={() => run(() => toggleApiKeyActive(item.id))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              item.isActive
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            {item.isActive ? '비활성화' : '활성화'}
          </button>

          {/* 할당량 초기화 */}
          {item.quotaExceeded && (
            <button
              onClick={() => run(() => resetApiKeyQuota(item.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              할당량 초기화
            </button>
          )}

          {/* 편집 */}
          <button
            onClick={() => { setEditing(true); setTestResult(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            편집
          </button>

          {/* 삭제 */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-500">삭제할까요?</span>
              <button onClick={() => run(() => deleteApiKey(item.id))}
                className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
                삭제
              </button>
              <button onClick={() => setShowConfirmDelete(false)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-semibold transition-colors ml-auto"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ServiceSection({ service, keys }: { service: string; keys: ApiKeyItem[] }) {
  const [showAddForm, setShowAddForm] = useState(false)

  const activeCount = keys.filter((k) => k.isActive && !k.quotaExceeded).length
  const quotaCount = keys.filter((k) => k.quotaExceeded).length

  return (
    <div>
      {/* 서비스 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${SERVICE_COLORS[service] ?? 'bg-gray-500'} flex items-center justify-center text-white`}>
            {SERVICE_ICONS[service] ?? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{SERVICE_LABELS[service] ?? service}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400">총 {keys.length}개</span>
              {activeCount > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">활성 {activeCount}개</span>}
              {quotaCount > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400">할당량 초과 {quotaCount}개</span>}
            </div>
          </div>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            키 추가
          </button>
        )}
      </div>

      {/* 키 순환 안내 */}
      {keys.length > 1 && (
        <div className="mb-3 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/50">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <span className="font-bold">자동 순환 활성화</span> — 우선순위 순서로 키를 사용하며, 할당량이 초과되면 다음 키로 자동 전환됩니다.
          </p>
        </div>
      )}

      {/* 추가 폼 */}
      {showAddForm && (
        <AddKeyForm service={service} onDone={() => setShowAddForm(false)} />
      )}

      {/* 키 목록 */}
      <div className="space-y-2 mt-3">
        {keys.length === 0 && !showAddForm ? (
          <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            <p>등록된 API 키가 없습니다.</p>
            <p className="text-xs mt-1">키 추가 버튼을 눌러 등록하세요.</p>
          </div>
        ) : (
          keys.map((key) => <KeyRow key={key.id} item={key} />)
        )}
      </div>
    </div>
  )
}

export default function ApiKeyManager({ apiKeys }: Props) {
  // 서비스별 그룹핑
  const grouped: Record<string, ApiKeyItem[]> = {}
  apiKeys.forEach((k) => {
    if (!grouped[k.service]) grouped[k.service] = []
    grouped[k.service].push(k)
  })

  // YouTube가 없으면 빈 섹션으로 표시
  if (!grouped['youtube']) grouped['youtube'] = []

  const services = Object.keys(grouped)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">API 키 관리</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          외부 API 키를 등록하고 할당량 초과 시 자동으로 다음 키를 사용하도록 설정합니다.
        </p>
      </div>

      <div className="px-6 py-6 max-w-3xl space-y-8">
        {/* 키 순환 동작 설명 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            키 자동 순환 방식
          </h3>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
              <p>우선순위(숫자 낮을수록 먼저) 순서대로 등록된 키를 사용합니다.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
              <p>할당량 초과(quotaExceeded) 또는 키 오류 시 다음 키로 자동 전환됩니다.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
              <p>모든 DB 키가 소진되면 환경변수 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">YOUTUBE_API_KEY</code>를 시도하고, 그것도 없으면 oEmbed를 사용합니다.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">!</span>
              <p>할당량은 매일 자정(태평양 표준시) 초기화됩니다. 초기화 버튼으로 수동 재활성화할 수 있습니다.</p>
            </div>
          </div>
        </div>

        {/* 서비스별 섹션 */}
        {services.map((service) => (
          <div key={service} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <ServiceSection service={service} keys={grouped[service]} />
          </div>
        ))}
      </div>
    </div>
  )
}
