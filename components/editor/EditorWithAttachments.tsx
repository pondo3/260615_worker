'use client'

import { useRef } from 'react'
import RichTextEditor from '@/components/tasks/RichTextEditor'
import AttachmentZone, { type AttachmentZoneHandle } from './AttachmentZone'
import type { AttachmentItem } from '@/app/actions/attachments'

type Props = {
  name: string
  entityType: string
  entityId?: number
  defaultValue?: string
  placeholder?: string
  onContentChange?: (html: string) => void
  onAttachmentsChange?: (attachments: AttachmentItem[]) => void
}

export default function EditorWithAttachments({
  name,
  entityType,
  entityId,
  defaultValue,
  placeholder,
  onContentChange,
  onAttachmentsChange,
}: Props) {
  const attachZoneRef = useRef<AttachmentZoneHandle>(null)

  return (
    <div>
      <RichTextEditor
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={onContentChange}
        onAttachClick={() => attachZoneRef.current?.openFilePicker()}
      />
      <AttachmentZone
        ref={attachZoneRef}
        entityType={entityType}
        entityId={entityId}
        onChange={onAttachmentsChange}
      />
    </div>
  )
}
