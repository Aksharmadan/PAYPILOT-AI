import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that do NOT require authentication
const PUBLIC_PATHS = ["/login", "/landing", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals, static assets, and auth endpoints
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  const token = request.cookies.get("paypilot_token")?.value;

  // If already logged in and trying to visit /login, send to dashboard
  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  // No token → redirect to /login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}


export const config = {
  // Run on all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
