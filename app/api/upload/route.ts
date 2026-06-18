import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { randomUUID } from 'crypto'
import { verifySession } from '@/lib/dal'

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(req: NextRequest) {
  try {
    await verifySession()

    const token = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'PUBLIC_BLOB_READ_WRITE_TOKEN 환경변수가 설정되지 않았습니다.' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 20MB를 초과할 수 없습니다.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? ''
    const uniqueName = `uploads/${randomUUID()}${ext ? '.' + ext : ''}`

    const blob = await put(uniqueName, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      token,
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '파일 업로드에 실패했습니다.'
    return NextResponse.json({ error: `[v3] ${message}` }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await verifySession()
    const url = new URL(req.url).searchParams.get('url')
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    await del(url)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
