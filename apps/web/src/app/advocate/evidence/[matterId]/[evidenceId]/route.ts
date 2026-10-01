import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matterId: string; evidenceId: string }> },
) {
  const token = (await cookies()).get("lawmedy_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", _request.url));
  const { matterId, evidenceId } = await params;
  const response = await fetch(
    `${process.env.API_URL || "http://127.0.0.1:4000"}/advocate/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(evidenceId)}/file`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok)
    return NextResponse.json({ message: "Evidence is unavailable." }, { status: response.status });
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": response.headers.get("content-disposition") || "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
