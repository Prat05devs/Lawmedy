import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ matterId: string }> }) {
  const token = (await cookies()).get("lawmedy_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  const { matterId } = await params;
  const response = await fetch(
    `${process.env.API_URL || "http://127.0.0.1:4000"}/admin/matters/${encodeURIComponent(matterId)}/evidence.zip`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ message: "No files to download." }, { status: response.status });
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": response.headers.get("content-disposition") || 'attachment; filename="files.zip"',
      "Cache-Control": "private, no-store",
    },
  });
}
