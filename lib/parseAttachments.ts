import type { AttachmentItem } from '@/app/actions/attachments'

export function parseAttachmentsFromFormData(formData: FormData): AttachmentItem[] {
  const raw = formData.get('attachments') as string | null
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
