import { auth } from "@/auth"
import { prisma } from "@/utils/prisma"
import { redirect } from "next/navigation"
import DashboardClient from "./client"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { id: session.user.id } } }
      ]
    },
    include: {
      _count: { select: { members: true, projects: true } },
      projects: {
        orderBy: { created_at: 'desc' },
        take: 3 // Show recent projects
      }
    }
  })

  // Serialize dates/counts if needed or pass directly (Server Components serialize JSON)
  // Prisma Dates are Date objects, Next.js passes them fine to Client Components usually
  
  return <DashboardClient user={session.user} initialGroups={groups} />
}
