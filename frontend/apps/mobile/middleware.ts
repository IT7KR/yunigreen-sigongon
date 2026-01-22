import { NextResponse, type NextRequest } from "next/server"

const isDev = process.env.NODE_ENV === "development"

const PUBLIC_ROUTES = ["/login", "/api"]
const AUTH_ROUTES = ["/login"]

export function middleware(request: NextRequest) {
  if (isDev) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  const accessToken = request.cookies.get("access_token")?.value

  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!isPublicRoute && !accessToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
}
