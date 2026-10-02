import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ matterId: string; evidenceId: string }> }) {
  const token = (await cookies()).get("lawmedy_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  const { matterId, evidenceId } = await params;
  const download = new URL(request.url).searchParams.get("download") ? "?download=1" : "";
  const response = await fetch(
    `${process.env.API_URL || "http://127.0.0.1:4000"}/admin/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(evidenceId)}/file${download}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ message: "File is unavailable." }, { status: response.status });
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
