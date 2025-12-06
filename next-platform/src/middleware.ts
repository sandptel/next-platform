import { auth } from "@/auth"

export default auth((req: any) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/api/groups")) {
    return Response.json(
      { message: "Unauthorized" },
      { status: 401 }
    )
  }
})

export const config = {
  matcher: ["/api/groups/:path*", "/dashboard/:path*", "/ide/:path*"],
}
