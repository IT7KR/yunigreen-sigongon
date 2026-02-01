import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/api", "/accept-invite"]
const AUTH_ROUTES = ["/login"]

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  const accessToken = request.cookies.get("access_token")?.value

  // Redirect authenticated users from login to dashboard
  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect authenticated users from landing page to dashboard
  if (accessToken && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!isPublicRoute && !accessToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Super Admin role check for /sa/* routes
  if (pathname.startsWith('/sa')) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const payload = parseJwt(accessToken)
    const role = payload?.role

    if (role !== 'super_admin') {
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
}
