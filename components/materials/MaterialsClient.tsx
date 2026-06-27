'use client'

import { useState, useCallback, useRef } from 'react'
import {
  addChannel,
  toggleChannel,
  deleteChannel,
  saveCollectionRules,
  deleteCollectionRule,
  getMaterials,
  setMaterialUsed,
  deleteMaterial,
} from '@/app/actions/materials'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Channel = {
  id: number
  channelId: string
  channelName: string
  thumbnailUrl: string
  isActive: boolean
  createdAt: string
}

type Rule = {
  id: number
  channelDbId: number
  channelName: string
  channelId: string
  minViews: number
  maxDaysOld: number
  minLikes: number
  minComments: number
  scheduleHour: number | null
  isActive: boolean
  createdAt: string
}

type Material = {
  id: number
  videoId: string
  title: string
  channelName: string
  channelId: string
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt: string | null
  thumbnailUrl: string
  platform: string
  isUsed: boolean
  usedAt: string | null
  collectedAt: string
}

type Toast = { id: number; message: string; type: 'success' | 'error' }

// ─── 간단한 토스트 훅 ────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const show = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return { toasts, show }
}

// ─── 확인 모달 ───────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-80 mx-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 스피너 ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export default function MaterialsClient({
  initialChannels,
  initialRules,
  initialMaterials,
}: {
  initialChannels: Channel[]
  initialRules: Rule[]
  initialMaterials: Material[]
}) {
  const { toasts, show } = useToast()

  // 채널 목록
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  // 룰 목록
  const [rules, setRules] = useState<Rule[]>(initialRules)
  // 소재 목록
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)

  // 섹션 열림 상태
  const [openSection, setOpenSection] = useState<'channels' | 'rules' | 'materials'>('channels')

  // 채널 입력
  const [channelInput, setChannelInput] = useState('')
  const [channelLoading, setChannelLoading] = useState(false)
  const [channelPreview, setChannelPreview] = useState<{ channelId: string; channelName: string; thumbnailUrl: string } | null>(null)

  // 룰 폼
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([])
  const [ruleMinViews, setRuleMinViews] = useState(0)
  const [ruleMaxDays, setRuleMaxDays] = useState(30)
  const [ruleMinLikes, setRuleMinLikes] = useState(0)
  const [ruleMinComments, setRuleMinComments] = useState(0)
  const [ruleScheduleHour, setRuleScheduleHour] = useState<number | ''>('')
  const [ruleSaving, setRuleSaving] = useState(false)
  const [collecting, setCollecting] = useState(false)

  // 소재 필터
  const [filterChannel, setFilterChannel] = useState('')
  const [filterUsed, setFilterUsed] = useState<'all' | 'unused' | 'used'>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // 삭제 확인 모달
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // 채널 삭제/토글 로딩
  const [channelActionId, setChannelActionId] = useState<number | null>(null)

  // ── 채널 등록 ───────────────────────────────────────────────────────────

  async function handleChannelLookup() {
    if (!channelInput.trim()) return
    setChannelLoading(true)
    setChannelPreview(null)
    try {
      const res = await fetch(`/api/channels/info?channelId=${encodeURIComponent(channelInput.trim())}`)
      const data = await res.json()
      if (!res.ok) { show(data.error ?? '채널 조회 실패', 'error'); return }
      setChannelPreview(data)
    } catch {
      show('채널 조회 중 오류가 발생했습니다.', 'error')
    } finally {
      setChannelLoading(false)
    }
  }

  async function handleAddChannel() {
    if (!channelPreview) return
    setChannelLoading(true)
    try {
      await addChannel(channelPreview.channelId, channelPreview.channelName, channelPreview.thumbnailUrl)
      setChannels((prev) => {
        const exists = prev.find((c) => c.channelId === channelPreview.channelId)
        if (exists) return prev.map((c) => c.channelId === channelPreview.channelId ? { ...c, ...channelPreview, isActive: true } : c)
        return [{ id: Date.now(), ...channelPreview, isActive: true, createdAt: new Date().toISOString() }, ...prev]
      })
      setChannelPreview(null)
      setChannelInput('')
      show('채널이 등록되었습니다.')
    } catch {
      show('채널 등록 중 오류가 발생했습니다.', 'error')
    } finally {
      setChannelLoading(false)
    }
  }

  async function handleToggleChannel(id: number, current: boolean) {
    setChannelActionId(id)
    try {
      await toggleChannel(id, !current)
      setChannels((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !current } : c))
    } catch {
      show('상태 변경 실패', 'error')
    } finally {
      setChannelActionId(null)
    }
  }

  function confirmDeleteChannel(id: number, name: string) {
    setConfirmModal({
      message: `"${name}" 채널을 삭제하면 관련 수집 조건도 모두 삭제됩니다. 계속하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await deleteChannel(id)
          setChannels((prev) => prev.filter((c) => c.id !== id))
          setRules((prev) => prev.filter((r) => r.channelDbId !== id))
          show('채널이 삭제되었습니다.')
        } catch {
          show('채널 삭제 실패', 'error')
        }
      },
    })
  }

  // ── 수집 룰 ─────────────────────────────────────────────────────────────

  async function handleSaveRules() {
    if (selectedChannelIds.length === 0) { show('채널을 1개 이상 선택해주세요.', 'error'); return }
    setRuleSaving(true)
    try {
      await saveCollectionRules(
        selectedChannelIds,
        ruleMinViews,
        ruleMaxDays,
        ruleMinLikes,
        ruleMinComments,
        ruleScheduleHour === '' ? null : ruleScheduleHour,
      )
      // 새 룰 목록 반영 (서버에서 리로드 대신 낙관적 업데이트)
      const newRules = selectedChannelIds.map((cId) => {
        const ch = channels.find((c) => c.id === cId)!
        return {
          id: Date.now() + cId,
          channelDbId: cId,
          channelName: ch.channelName,
          channelId: ch.channelId,
          minViews: ruleMinViews,
          maxDaysOld: ruleMaxDays,
          minLikes: ruleMinLikes,
          minComments: ruleMinComments,
          scheduleHour: ruleScheduleHour === '' ? null : ruleScheduleHour,
          isActive: true,
          createdAt: new Date().toISOString(),
        }
      })
      setRules((prev) => [...newRules, ...prev])
      setSelectedChannelIds([])
      show('수집 조건이 저장되었습니다.')
    } catch {
      show('저장 실패', 'error')
    } finally {
      setRuleSaving(false)
    }
  }

  function confirmDeleteRule(id: number) {
    setConfirmModal({
      message: '이 수집 조건을 삭제하시겠습니까?',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await deleteCollectionRule(id)
          setRules((prev) => prev.filter((r) => r.id !== id))
          show('수집 조건이 삭제되었습니다.')
        } catch {
          show('삭제 실패', 'error')
        }
      },
    })
  }

  async function handleCollectNow() {
    if (selectedChannelIds.length === 0) { show('채널을 1개 이상 선택해주세요.', 'error'); return }
    setCollecting(true)
    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_db_ids: selectedChannelIds,
          min_views: ruleMinViews,
          max_days_old: ruleMaxDays,
          min_likes: ruleMinLikes,
          min_comments: ruleMinComments,
        }),
      })
      const data = await res.json()
      if (!res.ok) { show(data.error ?? '수집 실패', 'error'); return }

      show(`${data.collected}개 영상 수집 완료 (${data.skipped}개 중복 제외)`)

      // 소재 목록 새로고침
      const fresh = await getMaterials()
      setMaterials(fresh.map((m) => ({
        id: m.id,
        videoId: m.videoId,
        title: m.title ?? '',
        channelName: m.channelName ?? '',
        channelId: m.channelId ?? '',
        viewCount: m.viewCount ?? 0,
        likeCount: m.likeCount ?? 0,
        commentCount: m.commentCount ?? 0,
        publishedAt: m.publishedAt?.toISOString() ?? null,
        thumbnailUrl: m.thumbnailUrl ?? '',
        platform: m.platform,
        isUsed: m.isUsed,
        usedAt: m.usedAt?.toISOString() ?? null,
        collectedAt: m.collectedAt.toISOString(),
      })))
      setOpenSection('materials')
    } catch {
      show('수집 중 오류가 발생했습니다.', 'error')
    } finally {
      setCollecting(false)
    }
  }

  // ── 소재 목록 ────────────────────────────────────────────────────────────

  async function handleSetUsed(id: number, isUsed: boolean) {
    try {
      await setMaterialUsed(id, isUsed)
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isUsed, usedAt: isUsed ? new Date().toISOString() : null } : m
        )
      )
    } catch {
      show('상태 변경 실패', 'error')
    }
  }

  function confirmDeleteMaterial(id: number) {
    setConfirmModal({
      message: '이 소재를 삭제하시겠습니까?',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await deleteMaterial(id)
          setMaterials((prev) => prev.filter((m) => m.id !== id))
          show('소재가 삭제되었습니다.')
        } catch {
          show('삭제 실패', 'error')
        }
      },
    })
  }

  // 소재 필터 적용
  const filteredMaterials = materials.filter((m) => {
    if (filterChannel && m.channelId !== filterChannel) return false
    if (filterUsed === 'unused' && m.isUsed) return false
    if (filterUsed === 'used' && !m.isUsed) return false
    if (filterDateFrom && m.collectedAt < filterDateFrom) return false
    if (filterDateTo && m.collectedAt > filterDateTo + 'T23:59:59') return false
    return true
  })

  // 채널별 unique 목록
  const uniqueChannels = [...new Map(materials.map((m) => [m.channelId, m.channelName])).entries()]

  // ── 섹션 헤더 ────────────────────────────────────────────────────────────

  function SectionHeader({
    id,
    title,
    count,
    color,
  }: {
    id: 'channels' | 'rules' | 'materials'
    title: string
    count?: number
    color: string
  }) {
    const isOpen = openSection === id
    return (
      <button
        onClick={() => setOpenSection(id)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-left ${
          isOpen
            ? `${color} border-transparent shadow-sm`
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`font-semibold text-sm ${isOpen ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </span>
          {count !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isOpen ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-gray-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">소재 탐색</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">YouTube 채널에서 영상 소재를 자동으로 수집합니다.</p>
      </div>

      <div className="space-y-3">
        {/* ── 섹션 A: 채널 관리 ── */}
        <div>
          <SectionHeader id="channels" title="A. 채널 관리" count={channels.length} color="bg-blue-500" />
          {openSection === 'channels' && (
            <div className="mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
              {/* 채널 URL 입력 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  YouTube 채널 URL 또는 채널 ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChannelLookup()}
                    placeholder="https://www.youtube.com/@channelname 또는 UCxxxxxxxx"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleChannelLookup}
                    disabled={channelLoading || !channelInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {channelLoading ? <Spinner /> : null}
                    조회
                  </button>
                </div>
              </div>

              {/* 채널 미리보기 */}
              {channelPreview && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  {channelPreview.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={channelPreview.thumbnailUrl}
                      alt={channelPreview.channelName}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{channelPreview.channelName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{channelPreview.channelId}</p>
                  </div>
                  <button
                    onClick={handleAddChannel}
                    disabled={channelLoading}
                    className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    등록
                  </button>
                </div>
              )}

              {/* 채널 목록 */}
              {channels.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">등록된 채널이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                    >
                      {ch.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ch.thumbnailUrl}
                          alt={ch.channelName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm font-bold">
                          {ch.channelName[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.channelName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{ch.channelId}</p>
                      </div>
                      {/* 활성/비활성 토글 */}
                      <button
                        onClick={() => handleToggleChannel(ch.id, ch.isActive)}
                        disabled={channelActionId === ch.id}
                        title={ch.isActive ? '비활성화' : '활성화'}
                        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${ch.isActive ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ch.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      {/* 삭제 */}
                      <button
                        onClick={() => confirmDeleteChannel(ch.id, ch.channelName)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 섹션 B: 수집 조건 ── */}
        <div>
          <SectionHeader id="rules" title="B. 수집 조건 설정" count={rules.length} color="bg-violet-500" />
          {openSection === 'rules' && (
            <div className="mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
              {/* 채널 선택 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">채널 선택 (다중)</label>
                {channels.length === 0 ? (
                  <p className="text-sm text-gray-400">먼저 채널을 등록해주세요.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {channels.map((ch) => (
                      <label key={ch.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedChannelIds.includes(ch.id)}
                          onChange={(e) =>
                            setSelectedChannelIds((prev) =>
                              e.target.checked ? [...prev, ch.id] : prev.filter((id) => id !== ch.id)
                            )
                          }
                          className="w-4 h-4 rounded border-gray-300 text-violet-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{ch.channelName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 조건 폼 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">최소 조회수</label>
                  <input
                    type="number"
                    min={0}
                    value={ruleMinViews}
                    onChange={(e) => setRuleMinViews(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">최근 며칠 이내</label>
                  <input
                    type="number"
                    min={1}
                    value={ruleMaxDays}
                    onChange={(e) => setRuleMaxDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">최소 좋아요수</label>
                  <input
                    type="number"
                    min={0}
                    value={ruleMinLikes}
                    onChange={(e) => setRuleMinLikes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">최소 댓글수</label>
                  <input
                    type="number"
                    min={0}
                    value={ruleMinComments}
                    onChange={(e) => setRuleMinComments(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* 자동 수집 시각 */}
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    자동 수집 시각 (KST, 0~23시)
                  </label>
                  <select
                    value={ruleScheduleHour}
                    onChange={(e) => setRuleScheduleHour(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">미설정 (수동만)</option>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i}시</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleSaveRules}
                  disabled={ruleSaving || selectedChannelIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {ruleSaving && <Spinner />}
                  조건 저장
                </button>
                <button
                  onClick={handleCollectNow}
                  disabled={collecting || selectedChannelIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {collecting && <Spinner />}
                  지금 수집
                </button>
              </div>

              {/* 저장된 룰 목록 */}
              {rules.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">저장된 수집 조건</p>
                  <div className="space-y-2">
                    {rules.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.channelName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            조회수 {r.minViews.toLocaleString()}+ · {r.maxDaysOld}일 이내 · 좋아요 {r.minLikes}+ · 댓글 {r.minComments}+
                            {r.scheduleHour !== null ? ` · 매일 ${r.scheduleHour}시 자동수집` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => confirmDeleteRule(r.id)}
                          className="flex-shrink-0 ml-3 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 섹션 C: 수집된 소재 목록 ── */}
        <div>
          <SectionHeader id="materials" title="C. 수집된 소재 목록" count={materials.length} color="bg-emerald-500" />
          {openSection === 'materials' && (
            <div className="mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
              {/* 필터 */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">전체 채널</option>
                  {uniqueChannels.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>

                <select
                  value={filterUsed}
                  onChange={(e) => setFilterUsed(e.target.value as 'all' | 'unused' | 'used')}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">전체</option>
                  <option value="unused">미사용만</option>
                  <option value="used">사용완료만</option>
                </select>

                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  title="수집일 시작"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  title="수집일 종료"
                />

                {(filterChannel || filterUsed !== 'all' || filterDateFrom || filterDateTo) && (
                  <button
                    onClick={() => { setFilterChannel(''); setFilterUsed('all'); setFilterDateFrom(''); setFilterDateTo('') }}
                    className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                {filteredMaterials.length}개 표시 중 (전체 {materials.length}개)
              </p>

              {/* 소재 카드 목록 */}
              {filteredMaterials.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">
                  {materials.length === 0 ? '수집된 소재가 없습니다. 수집 조건을 설정하고 수집을 실행해보세요.' : '필터 조건에 맞는 소재가 없습니다.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMaterials.map((m) => (
                    <MaterialCard
                      key={m.id}
                      material={m}
                      onSetUsed={handleSetUsed}
                      onDelete={() => confirmDeleteMaterial(m.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 토스트 */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-80 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border animate-in slide-in-from-right-5 duration-300 ${
              t.type === 'success'
                ? 'bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 text-gray-900 dark:text-white border-l-4 border-l-emerald-500'
                : 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 text-gray-900 dark:text-white border-l-4 border-l-red-500'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* 확인 모달 */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}

// ─── 소재 카드 ───────────────────────────────────────────────────────────────

function MaterialCard({
  material: m,
  onSetUsed,
  onDelete,
}: {
  material: Material
  onSetUsed: (id: number, isUsed: boolean) => void
  onDelete: () => void
}) {
  const publishedDate = m.publishedAt ? new Date(m.publishedAt).toLocaleDateString('ko-KR') : '-'
  const collectedDate = new Date(m.collectedAt).toLocaleDateString('ko-KR')
  const usedDate = m.usedAt ? new Date(m.usedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-800">
        {m.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.thumbnailUrl}
            alt={m.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {/* 사용 뱃지 */}
        <div className="absolute top-2 right-2">
          {m.isUsed ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">사용완료</span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-500 text-white">미사용</span>
          )}
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        <a
          href={`https://www.youtube.com/watch?v=${m.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:text-blue-500 transition-colors"
        >
          {m.title || '(제목 없음)'}
        </a>
        <p className="text-xs text-gray-500 dark:text-gray-400">{m.channelName}</p>

        {/* 통계 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>👁 {m.viewCount.toLocaleString()}</span>
          <span>👍 {m.likeCount.toLocaleString()}</span>
          <span>💬 {m.commentCount.toLocaleString()}</span>
        </div>

        <div className="flex flex-col gap-0.5 text-[11px] text-gray-400 dark:text-gray-500">
          <span>업로드: {publishedDate}</span>
          <span>수집: {collectedDate}</span>
          {m.isUsed && usedDate && <span className="text-emerald-600 dark:text-emerald-400">사용 처리: {usedDate}</span>}
        </div>

        {/* 버튼들 */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {m.isUsed ? (
            <button
              onClick={() => onSetUsed(m.id, false)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              미사용으로 되돌리기
            </button>
          ) : (
            <button
              onClick={() => onSetUsed(m.id, true)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              사용함으로 표시
            </button>
          )}
          <button
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="대본 작업 (추후 연동 예정)"
            disabled
          >
            대본 작업
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="삭제"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
