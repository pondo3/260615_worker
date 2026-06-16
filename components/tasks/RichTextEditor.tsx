'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useEffect, useRef } from 'react'

type Props = {
  name: string
  defaultValue?: string
  placeholder?: string
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json()
  return data.url as string
}

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void
  active?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`px-1.5 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ name, defaultValue = '', placeholder }: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) continue
            uploadImage(file).then((url) => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: url })
                )
              )
            })
            return true
          }
        }
        return false
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
        if (!imageFiles.length) return false
        event.preventDefault()
        imageFiles.forEach((file) => {
          uploadImage(file).then((url) => {
            const { tr, schema } = view.state
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? 0
            view.dispatch(tr.insert(pos, schema.nodes.image.create({ src: url })))
          })
        })
        return true
      },
    },
    onUpdate({ editor }) {
      if (hiddenRef.current) {
        hiddenRef.current.value = editor.getHTML()
      }
    },
  })

  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = defaultValue
    }
  }, [defaultValue])

  if (!editor) return null

  const headingOptions = [
    { label: 'Normal', action: () => editor.chain().focus().setParagraph().run() },
    { label: 'H1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  ]

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'H1' : editor.isActive('heading', { level: 2 })
    ? 'H2' : editor.isActive('heading', { level: 3 })
    ? 'H3' : 'Normal'

  async function handleImageFile(file: File) {
    const url = await uploadImage(file)
    editor?.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
        <select
          value={currentHeading}
          onChange={(e) => {
            const opt = headingOptions.find((o) => o.label === e.target.value)
            opt?.action()
            editor.commands.focus()
          }}
          className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 mr-1 focus:outline-none"
        >
          {headingOptions.map((o) => (
            <option key={o.label} value={o.label}>{o.label}</option>
          ))}
        </select>

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄">
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
          <span className="line-through">S</span>
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

        <label title="글자 색상" className="cursor-pointer px-1.5 py-1 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-0.5">
          <span className="font-medium" style={{ color: '#e03' }}>A</span>
          <input type="color" className="w-0 h-0 opacity-0 absolute"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
        </label>

        <label title="형광펜" className="cursor-pointer px-1.5 py-1 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-0.5">
          <span className="font-medium bg-yellow-200 px-0.5">A</span>
          <input type="color" className="w-0 h-0 opacity-0 absolute" defaultValue="#fef08a"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
        </label>

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">≡</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">≣</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">❝</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="코드">{'</>'}</ToolbarButton>

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

        {/* 이미지 업로드 버튼 */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="이미지 삽입 (붙여넣기도 가능)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageFile(file)
            e.target.value = ''
          }}
        />

        <ToolbarButton
          onClick={() => {
            const url = prompt('링크 URL을 입력하세요:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          active={editor.isActive('link')}
          title="링크"
        >
          🔗
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="서식 초기화">
          <span className="text-xs">Tx</span>
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-[160px] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none"
      />

      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  )
}
