import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { logout } from '@/app/actions/auth'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  })

  return (
    <DashboardShell
      user={{ name: user?.name ?? '', email: user?.email ?? '' }}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  )
}
