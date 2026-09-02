import type { RuntimeEnv } from "./env";
import { fetchWithTimeout } from "./http";

type DestroyResponse = { result?: unknown; error?: { message?: unknown } };

export async function cloudinarySignature(
  parameters: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  const serialized = Object.entries(parameters)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const bytes = new TextEncoder().encode(`${serialized}${apiSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function destroyCloudinaryImage(
  publicId: string,
  runtime: RuntimeEnv,
): Promise<"deleted" | "not_found"> {
  const timestamp = Math.floor(Date.now() / 1000);
  const parameters = { invalidate: "true", public_id: publicId, timestamp };
  const signature = await cloudinarySignature(parameters, runtime.CLOUDINARY_API_SECRET);
  const form = new URLSearchParams({
    api_key: runtime.CLOUDINARY_API_KEY,
    invalidate: "true",
    public_id: publicId,
    signature,
    timestamp: String(timestamp),
  });
  const response = await fetchWithTimeout(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(runtime.CLOUDINARY_CLOUD_NAME)}/image/destroy`,
    { method: "POST", body: form },
    15_000,
  );
  let body: DestroyResponse | null = null;
  try {
    body = (await response.json()) as DestroyResponse;
  } catch {
    // The status and result checks below handle an unreadable response.
  }
  if (!response.ok) {
    const detail = typeof body?.error?.message === "string" ? body.error.message : `status ${response.status}`;
    throw new Error(`Cloudinary deletion failed: ${detail}`);
  }
  if (body?.result === "ok") return "deleted";
  if (body?.result === "not found") return "not_found";
  throw new Error("Cloudinary returned an unexpected deletion result");
}
