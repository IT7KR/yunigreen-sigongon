import {
  createAuthMiddleware,
} from "@sigongon/platform";

const PUBLIC_ROUTES = ["/login", "/api", "/worker"];
const AUTH_ROUTES = ["/login"];

export const middleware = createAuthMiddleware({
  devBypass: true,
  publicRoutes: PUBLIC_ROUTES,
  authRoutes: AUTH_ROUTES,
  loginPath: "/login",
  authenticatedRedirectPath: "/",
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
