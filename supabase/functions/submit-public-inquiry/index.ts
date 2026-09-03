type InquiryInput = {
  p_kind: "query" | "estimate";
  p_submission_id: string | null;
  p_name: string;
  p_phone: string;
  p_category: string;
  p_message: string;
  p_attachment_public_id: string | null;
  p_attachment_url: string | null;
  p_location: string | null;
  p_approximate_size: string | null;
  p_material_preference: string | null;
};

type InquiryRpcResult = { ok?: unknown; duplicate?: unknown };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(message = "Invalid inquiry request."): Response {
  return Response.json({ error: message }, { status: 400 });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Dependency request timed out.")), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

async function secretHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hashesMatch(provided: string, expected: string): boolean {
  const left = new TextEncoder().encode(provided);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function internalSecretIsValid(providedSecret: string, supabaseUrl: string, serviceRoleKey: string): Promise<boolean> {
  if (!providedSecret) return false;
  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/rpc/get_public_inquiry_secret_hash`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    console.error(JSON.stringify({ message: "Unable to read public inquiry secret hash", status: response.status }));
    return false;
  }
  const expectedHash = await response.json();
  return typeof expectedHash === "string" && hashesMatch(await secretHash(providedSecret), expectedHash);
}

function stringOrNull(value: unknown, maximumLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maximumLength) throw new Error("invalid");
  return value;
}

function parseInquiry(value: unknown): InquiryInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
  const input = value as Record<string, unknown>;
  if (input.p_kind !== "query" && input.p_kind !== "estimate") throw new Error("invalid");

  const rawSubmissionId = stringOrNull(input.p_submission_id, 36);
  if (rawSubmissionId && !uuidPattern.test(rawSubmissionId)) throw new Error("invalid");
  const p_name = stringOrNull(input.p_name, 150);
  const p_phone = stringOrNull(input.p_phone, 40);
  const p_category = stringOrNull(input.p_category, 64);
  const p_message = stringOrNull(input.p_message, 4000);
  if (!p_name || !p_phone || !p_category || !p_message) throw new Error("invalid");

  return {
    p_kind: input.p_kind,
    p_submission_id: rawSubmissionId ? rawSubmissionId.toLowerCase() : null,
    p_name,
    p_phone,
    p_category,
    p_message,
    p_attachment_public_id: stringOrNull(input.p_attachment_public_id, 500),
    p_attachment_url: stringOrNull(input.p_attachment_url, 2000),
    p_location: stringOrNull(input.p_location, 200),
    p_approximate_size: stringOrNull(input.p_approximate_size, 100),
    p_material_preference: stringOrNull(input.p_material_preference, 200),
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Edge Function runtime credentials.");
    return Response.json({ error: "Service unavailable." }, { status: 503 });
  }

  const providedSecret = request.headers.get("X-Rupantar-Internal-Secret") ?? "";
  try {
    if (!(await internalSecretIsValid(providedSecret, supabaseUrl, serviceRoleKey))) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
  } catch (error) {
    console.error(JSON.stringify({ message: "Public inquiry secret validation failed", error: error instanceof Error ? error.message : "unknown" }));
    return Response.json({ error: "Service unavailable." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > 16 * 1024) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  let input: InquiryInput;
  try { input = parseInquiry(await request.json()); }
  catch { return invalidRequest(); }

  const rpcInput = input.p_submission_id
    ? input
    : {
        p_kind: input.p_kind,
        p_name: input.p_name,
        p_phone: input.p_phone,
        p_category: input.p_category,
        p_message: input.p_message,
        p_attachment_public_id: input.p_attachment_public_id,
        p_attachment_url: input.p_attachment_url,
        p_location: input.p_location,
        p_approximate_size: input.p_approximate_size,
        p_material_preference: input.p_material_preference,
      };

  let response: Response;
  try {
    response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/rpc/submit_public_inquiry`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(rpcInput),
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "Public inquiry RPC timed out", error: error instanceof Error ? error.message : "unknown" }));
    return Response.json({ error: "Your request could not be sent. Please try again." }, { status: 503 });
  }

  let result: InquiryRpcResult | null = null;
  try { result = (await response.json()) as InquiryRpcResult; }
  catch { /* Status handling below provides the fallback. */ }

  if (!response.ok || result?.ok !== true) {
    console.error(JSON.stringify({ message: "Public inquiry RPC failed", status: response.status }));
    return Response.json({ error: "Your request could not be sent. Please try again." }, { status: response.status === 429 ? 429 : 400 });
  }

  return Response.json({ ok: true, duplicate: result.duplicate === true }, { status: result.duplicate === true ? 200 : 201 });
});
