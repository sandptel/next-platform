import { auth } from "@/auth"
import { prisma } from "@/utils/prisma"
import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { id: session.user.id } } }
      ]
    },
    include: {
      _count: { select: { members: true, projects: true } }
    }
  })

  return NextResponse.json(groups)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { group_name } = await req.json()
  
  const group = await prisma.group.create({
    data: {
      group_name,
      ownerId: session.user.id!,
      access_code: nanoid(10),
      members: {
        connect: { id: session.user.id }
      }
    }
  })

  return NextResponse.json(group)
}
