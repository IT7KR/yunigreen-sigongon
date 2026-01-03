import { NextResponse, type NextRequest } from "next/server"

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/api"]

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if route is an auth route (login, register, etc.)
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Get access token from cookie or header
  // Note: localStorage is not available in middleware (Edge runtime)
  // We use cookies instead for middleware auth checks
  const accessToken = request.cookies.get("access_token")?.value

  // If user is authenticated and trying to access auth routes, redirect to home
  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If route is not public and user is not authenticated, redirect to login
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
