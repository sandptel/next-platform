import { auth } from "@/auth"
import { prisma } from "@/utils/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const { groupId } = await params
  
  // Verify membership
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: { some: { id: session.user.id } }
    }
  })
  if (!group) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const projects = await prisma.project.findMany({
    where: { groupId },
    orderBy: { created_at: 'desc' },
     include: { code: true }
  })

  return NextResponse.json(projects)
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { project_name } = await req.json()
  const { groupId } = await params
  
  // Verify membership
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: { some: { id: session.user.id } }
    }
  })
  if (!group) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const project = await prisma.project.create({
    data: {
      project_name,
      groupId: groupId,
      code: {
        create: {
            content: ""
        }
      }
    }
  })

  return NextResponse.json(project)
}
