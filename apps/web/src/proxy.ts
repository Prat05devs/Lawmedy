import { NextRequest, NextResponse } from "next/server";

// Trust a deployment value, never a client-supplied Host/X-Forwarded-Host, for
// state-changing requests. The API uses bearer auth; browser actions use cookies.
export function proxy(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return NextResponse.next();
  const trusted = process.env.APP_ORIGIN || (process.env.NODE_ENV !== "production"
    ? request.nextUrl.origin : process.env.NEXT_PUBLIC_SITE_URL || "");
  let origin: URL;
  try {
    origin = new URL(trusted);
    if (origin.origin !== trusted || request.headers.get("origin") !== origin.origin)
      return new NextResponse("Invalid request origin.", { status: 403 });
  } catch { return new NextResponse("Website origin is not configured.", { status: 503 }); }
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", origin.host);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
