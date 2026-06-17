'use client'

import { useState } from 'react'
import type { FolderNode } from '@/app/actions/resourceFolders'

type TargetFolder = { id: number | null; name: string } | null

type Props = {
  folders: FolderNode[]
  selectedCount: number
  onMove: (folderId: number | null, folderName: string) => void
  onClose: () => void
}

function FolderTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: FolderNode
  depth: number
  selectedId: number | null | undefined
  onSelect: (id: number, name: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedId === node.id

  return (
    <div>
      <div className="flex items-center">
        <button
          onClick={() => onSelect(node.id, node.name)}
          className={`flex-1 text-left flex items-center gap-2 py-2 rounded-xl text-sm transition-colors ${
            isSelected
              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: '12px' }}
        >
          <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="truncate">{node.name}</span>
          {node._count > 0 && (
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 pl-2">{node._count}</span>
          )}
        </button>
        {node.children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {expanded &&
        node.children.map((child) => (
          <FolderTreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}

function flattenSearch(nodes: FolderNode[], query: string): FolderNode[] {
  const result: FolderNode[] = []
  function walk(list: FolderNode[]) {
    for (const n of list) {
      if (n.name.toLowerCase().includes(query.toLowerCase())) result.push(n)
      walk(n.children)
    }
  }
  walk(nodes)
  return result
}

export default function FolderMoveModal({ folders, selectedCount, onMove, onClose }: Props) {
  const [target, setTarget] = useState<TargetFolder>(null)
  const [search, setSearch] = useState('')

  const searchResults = search ? flattenSearch(folders, search) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 flex flex-col"
        style={{ maxHeight: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">폴더로 이동</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            선택한 자료{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">{selectedCount}개</span>를
            이동할 폴더를 선택하세요.
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="폴더 검색..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-teal-400 text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* 미분류 */}
          <button
            onClick={() => setTarget({ id: null, name: '미분류' })}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-0.5 transition-colors ${
              target?.name === '미분류'
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            미분류
          </button>

          {/* Folder tree or search results */}
          {searchResults ? (
            searchResults.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">검색 결과가 없습니다.</p>
            ) : (
              searchResults.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setTarget({ id: node.id, name: node.name })}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    target?.id === node.id
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="truncate">{node.name}</span>
                  {node._count > 0 && (
                    <span className="ml-auto text-xs text-gray-400">{node._count}</span>
                  )}
                </button>
              ))
            )
          ) : folders.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">폴더가 없습니다.</p>
          ) : (
            folders.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedId={target?.id}
                onSelect={(id, name) => setTarget({ id, name })}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => target && onMove(target.id, target.name)}
            disabled={!target}
            className="flex-1 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 transition-colors disabled:opacity-40"
          >
            이동
          </button>
        </div>
      </div>
    </div>
  )
}
