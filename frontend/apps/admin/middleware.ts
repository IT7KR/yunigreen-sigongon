import {
  createAuthMiddleware,
} from "@sigongon/platform";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/api",
  "/accept-invite",
  "/onboarding/worker",
];

const AUTH_ROUTES = ["/login"];

export const middleware = createAuthMiddleware({
  publicRoutes: PUBLIC_ROUTES,
  authRoutes: AUTH_ROUTES,
  loginPath: "/login",
  authenticatedRedirectPath: "/dashboard",
  authenticatedRootRedirectPath: "/dashboard",
  forbidWorkerOnPrivateRoutes: true,
  workerRole: "worker",
  forbiddenRedirectPath: "/403",
  superAdminRoutePrefix: "/sa",
  superAdminRole: "super_admin",
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
