import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never need authentication
const PUBLIC_PATHS = ["/landing", "/login", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals and static assets
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  const token = request.cookies.get("paypilot_token")?.value;

  // Already authenticated → skip /landing and /login, send to dashboard
  if (token && (pathname.startsWith("/landing") || pathname.startsWith("/login"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  // No token → send to product story landing page (not straight to login)
  if (!token) {
    const landingUrl = new URL("/landing", request.url);
    // Preserve where they wanted to go so the CTA can deep-link after sign-in
    landingUrl.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
