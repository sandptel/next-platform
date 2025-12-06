import { auth } from "@/auth"
import { prisma } from "@/utils/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { access_code } = await req.json()
  
  const group = await prisma.group.findUnique({
    where: { access_code }
  })

  if (!group) return NextResponse.json({ error: "Invalid code" }, { status: 404 })

  // Check if already member
  const isMember = await prisma.group.findFirst({
    where: {
      id: group.id,
      members: { some: { id: session.user.id } }
    }
  })

  if (isMember) return NextResponse.json(group)

  await prisma.group.update({
    where: { id: group.id },
    data: {
      members: {
        connect: { id: session.user.id }
      }
    }
  })

  return NextResponse.json(group)
}
