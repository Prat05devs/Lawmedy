import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matterId: string; evidenceId: string }> },
) {
  const token = (await cookies()).get("lawmedy_session")?.value;
  if (!token) return new Response("Please log in again.", { status: 401 });
  const { matterId, evidenceId } = await params;
  const incoming = new URL(request.url);
  const upstream = new URL(
    `/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(evidenceId)}/file`,
    process.env.API_URL || "http://127.0.0.1:4000",
  );
  upstream.search = incoming.search;
  const response = await fetch(upstream, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok)
    return new Response(
      response.status === 401
        ? "Please log in again."
        : "This private file link is invalid or has expired.",
      { status: response.status },
    );
  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-disposition",
    "cache-control",
    "x-content-type-options",
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: 200, headers });
}
