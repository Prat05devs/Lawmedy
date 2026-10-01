const base = process.env.API_URL || "http://127.0.0.1:4000";
const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function request(path, options = {}, token) {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.arrayBuffer();
  return { response, body };
}

async function account(label) {
  const result = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      fullName: `Phase Three ${label}`,
      email: `phase3-${label}-${unique}@example.test`,
      password: `LocalOnly-${unique}`,
    }),
  });
  if (!result.response.ok)
    throw new Error(`Signup failed: ${result.response.status}`);
  return result.body.accessToken;
}

const owner = await account("owner");
const stranger = await account("stranger");
const created = await request(
  "/matters",
  { method: "POST", body: JSON.stringify({ type: "LEGAL_NOTICE" }) },
  owner,
);
if (!created.response.ok)
  throw new Error(`Matter creation failed: ${created.response.status}`);
const matterId = created.body.id;

// A valid, transparent 1×1 PNG.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const form = new FormData();
form.set("file", new Blob([png], { type: "image/png" }), "receipt.png");
const uploaded = await request(
  `/matters/${matterId}/evidence`,
  { method: "POST", body: form },
  owner,
);
if (uploaded.response.status !== 201)
  throw new Error(`Upload failed: ${uploaded.response.status}`);
if (uploaded.body.status !== "PROCESSING")
  throw new Error("Upload did not begin in PROCESSING state.");

let item;
for (let attempt = 0; attempt < 30; attempt += 1) {
  const listed = await request(`/matters/${matterId}/evidence`, {}, owner);
  if (!listed.response.ok)
    throw new Error(`List failed: ${listed.response.status}`);
  item = listed.body.find((entry) => entry.id === uploaded.body.id);
  if (item?.status !== "PROCESSING") break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (!item || item.status === "PROCESSING")
  throw new Error("Evidence processing did not finish.");

const privateFile = await request(item.viewUrl, {}, owner);
if (!privateFile.response.ok || privateFile.body.byteLength !== png.length)
  throw new Error("Authenticated private file download failed.");
const deniedDownload = await request(item.viewUrl);
if (deniedDownload.response.status !== 401)
  throw new Error("Private file was downloadable without authentication.");
const deniedList = await request(`/matters/${matterId}/evidence`, {}, stranger);
if (deniedList.response.status !== 404)
  throw new Error("Cross-user evidence list was not hidden.");

if (item.status === "FAILED") {
  if (!item.statusMessage)
    throw new Error("Failed extraction has no safe user message.");
  const retried = await request(
    `/matters/${matterId}/evidence/${item.id}/retry`,
    { method: "POST" },
    owner,
  );
  if (!retried.response.ok)
    throw new Error(`Retry failed: ${retried.response.status}`);
}

console.log(
  `PASS: private upload, signed download, extraction ${item.status.toLowerCase()}, retry path, and ownership isolation.`,
);
