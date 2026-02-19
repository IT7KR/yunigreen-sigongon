import { NextResponse, type NextRequest } from "next/server";

export const DESKTOP_STATIC_EXCLUDE_MATCHER =
  "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)";

export const MOBILE_STATIC_EXCLUDE_MATCHER =
  "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)";

export interface CreateAuthMiddlewareOptions {
  devBypass?: boolean;
  publicRoutes: string[];
  authRoutes: string[];
  loginPath?: string;
  authenticatedRedirectPath: string;
  authenticatedRootRedirectPath?: string;
  forbidWorkerOnPrivateRoutes?: boolean;
  workerRole?: string;
  forbiddenRedirectPath?: string;
  superAdminRoutePrefix?: string;
  superAdminRole?: string;
  superAdminBlockedRoutePrefixes?: string[];
  superAdminBlockedRedirectPath?: string;
}

function routeMatches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(""),
    );

    return JSON.parse(jsonPayload) as { role?: string };
  } catch {
    return null;
  }
}

export function createAuthMiddleware(options: CreateAuthMiddlewareOptions) {
  const {
    devBypass = false,
    publicRoutes,
    authRoutes,
    loginPath = "/login",
    authenticatedRedirectPath,
    authenticatedRootRedirectPath,
    forbidWorkerOnPrivateRoutes = false,
    workerRole = "worker",
    forbiddenRedirectPath = "/403",
    superAdminRoutePrefix,
    superAdminRole = "super_admin",
    superAdminBlockedRoutePrefixes = [],
    superAdminBlockedRedirectPath = "/",
  } = options;

  return function middleware(request: NextRequest) {
    if (devBypass && process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }

    const { pathname } = request.nextUrl;

    const isPublicRoute = publicRoutes.some((route) => routeMatches(pathname, route));
    const isAuthRoute = authRoutes.some((route) => routeMatches(pathname, route));
    const accessToken = request.cookies.get("access_token")?.value;

    if (accessToken && isAuthRoute) {
      return NextResponse.redirect(new URL(authenticatedRedirectPath, request.url));
    }

    if (
      accessToken &&
      authenticatedRootRedirectPath &&
      pathname === "/"
    ) {
      return NextResponse.redirect(
        new URL(authenticatedRootRedirectPath, request.url),
      );
    }

    if (!isPublicRoute && !accessToken) {
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = accessToken ? parseJwt(accessToken)?.role : undefined;

    if (
      accessToken &&
      role === superAdminRole &&
      superAdminBlockedRoutePrefixes.some((prefix) => routeMatches(pathname, prefix))
    ) {
      return NextResponse.redirect(new URL(superAdminBlockedRedirectPath, request.url));
    }

    if (forbidWorkerOnPrivateRoutes && accessToken && role === workerRole && !isPublicRoute) {
      return NextResponse.redirect(new URL(forbiddenRedirectPath, request.url));
    }

    if (superAdminRoutePrefix && pathname.startsWith(superAdminRoutePrefix)) {
      if (!accessToken) {
        const loginUrl = new URL(loginPath, request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (role !== superAdminRole) {
        return NextResponse.redirect(new URL(forbiddenRedirectPath, request.url));
      }
    }

    return NextResponse.next();
  };
}
