import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, readSession } from "@/lib/session";

// Bounces visitors without a valid staff session. requireAdmin() checks again, and against the
// staff list, on every admin page and server action.
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/login")) return NextResponse.next();
  const user = await readSession("admin", req.cookies.get(ADMIN_COOKIE)?.value);
  if (!user) return NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
