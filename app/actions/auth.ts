'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSession, deleteSession } from '@/lib/session'

export type AuthState =
  | { errors?: { name?: string[]; email?: string[]; password?: string[]; general?: string[] } }
  | undefined

export async function register(state: AuthState, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const errors: Record<string, string[]> = {}

  if (!name || name.length < 2) errors.name = ['이름은 2자 이상이어야 합니다.']
  if (!email || !email.includes('@')) errors.email = ['올바른 이메일을 입력하세요.']
  if (!password || password.length < 6) errors.password = ['비밀번호는 6자 이상이어야 합니다.']

  if (Object.keys(errors).length > 0) return { errors }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { errors: { email: ['이미 사용 중인 이메일입니다.'] } }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  })

  await createSession(user.id)
  redirect('/dashboard')
}

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { errors: { general: ['이메일과 비밀번호를 입력하세요.'] } }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { errors: { general: ['이메일 또는 비밀번호가 올바르지 않습니다.'] } }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return { errors: { general: ['이메일 또는 비밀번호가 올바르지 않습니다.'] } }

  await createSession(user.id)
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
