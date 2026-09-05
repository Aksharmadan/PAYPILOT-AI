import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never need authentication
const PUBLIC_PATHS = ["/landing", "/login", "/api/auth"];

// Dashboard routes that require auth (everything that's NOT public and NOT root)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("paypilot_token")?.value;

  // Always allow Next.js internals and static assets
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isStatic) return NextResponse.next();

  // ROOT "/" — always redirect to landing page for everyone
  // (logged-in users use the "Enter PayPilot" CTA to reach /command-center)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/landing", request.url));
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // /login → if already logged in, skip to command center
  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/command-center", request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  // Everything else needs a token
  if (!token) {
    const landingUrl = new URL("/landing", request.url);
    landingUrl.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
