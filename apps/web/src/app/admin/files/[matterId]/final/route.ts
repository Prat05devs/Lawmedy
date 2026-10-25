import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Final PDF download for the admin team (to share with the user on WhatsApp).
export async function GET(request: Request, { params }: { params: Promise<{ matterId: string }> }) {
  const token = (await cookies()).get("lawmedy_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  const { matterId } = await params;
  const response = await fetch(
    `${process.env.API_URL || "http://127.0.0.1:4000"}/admin/matters/${encodeURIComponent(matterId)}/final-document/file`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ message: "The final PDF is unavailable." }, { status: response.status });
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": response.headers.get("content-disposition") || "attachment",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
