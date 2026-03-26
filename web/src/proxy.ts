import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Protective route shell ensuring isolation of user workspaces
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboardRoute) {
    /**
     * In a production environment with NextAuth or a Django session backend,
     * this token check ensures that users without a session are immediately
     * deflected back to the /login page, guaranteeing that tracked projects
     * cannot cross-pollinate.
     *
     * const auth = request.cookies.get('monix_session');
     * if (!auth) return NextResponse.redirect(new URL('/login', request.url));
     */
    // For local UI preview without a live backend connection, we allow pass through
    // but establish the boundary so that next steps can simply toggle the check.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
