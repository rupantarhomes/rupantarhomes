import { cloudinarySignature, destroyCloudinaryImage } from "../_lib/cloudinary";
import { type RuntimeEnv } from "../_lib/env";
import { errorMessage, json } from "../_lib/http";

const maximumAttachmentBytes = 10 * 1024 * 1024;
const maximumRequestBytes = 11 * 1024 * 1024;
const web3FormsAccessKey = "9cb63466-337d-4480-80f1-2ee7a00f25a3";
const supabaseUrl = "https://gmtdqeskyvdvyibccxwt.supabase.co";
const supabasePublishableKey = "sb_publishable_RdT2JC1U6Im3VKobzFzTjg_hy-SWjJo";
const acceptedAttachmentTypes = new Set(["image/jpeg", "image/png"]);
const allowedCategories = new Set([
  "interior-designing",
  "modular-kitchen",
  "tv-cabinet",
  "wardrobe",
  "hydraulic-bed",
  "false-ceiling",
  "parqueting",
  "railing",
]);

type InquiryKind = "query" | "estimate";
type InquiryPayload = Record<string, string | null>;
type CloudinaryUpload = {
  secure_url?: unknown;
  public_id?: unknown;
  width?: unknown;
  height?: unknown;
  bytes?: unknown;
  format?: unknown;
  error?: { message?: unknown };
};
type Web3FormsResult = {
  success?: unknown;
  message?: unknown;
};

class PublicRequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function requiredEnv(env: RuntimeEnv, name: keyof RuntimeEnv): string {
  const value = env[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing Cloudflare environment variable: ${String(name)}`);
  return value.trim();
}

function textField(form: FormData, name: string, label: string, maximumLength: number): string {
  const value = form.get(name);
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new PublicRequestError(`${label} is required.`);
  if (normalized.length > maximumLength) throw new PublicRequestError(`${label} is too long.`);
  return normalized;
}

function inquiryKind(form: FormData): InquiryKind {
  const kind = form.get("kind");
  if (kind === "query" || kind === "estimate") return kind;
  throw new PublicRequestError("Invalid request type.");
}

function category(form: FormData): string {
  const value = textField(form, "category", "Category", 64);
  if (!allowedCategories.has(value)) throw new PublicRequestError("Please select a valid category.");
  return value;
}

function attachment(form: FormData, required: boolean): File | null {
  const values = form.getAll("attachment");
  if (values.length > 1) throw new PublicRequestError("Attach only one photo.");
  const value = values[0];
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new PublicRequestError("Please upload a space photo.");
    return null;
  }
  if (!acceptedAttachmentTypes.has(value.type)) throw new PublicRequestError("Please choose a JPG or PNG photo.");
  if (value.size > maximumAttachmentBytes) throw new PublicRequestError("Photo must be 10MB or smaller.");
  return value;
}

async function verifyImageSignature(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if ((file.type === "image/jpeg" && !jpeg) || (file.type === "image/png" && !png)) {
    throw new PublicRequestError("The attached photo is not a valid JPG or PNG file.");
  }
}

function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new PublicRequestError("This request must be sent from the Rupantar website.", 403);
  }
}

async function rateLimitKey(phone: string): Promise<string> {
  const normalized = phone.replace(/\D/g, "") || phone.toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceOptionalRateLimits(phone: string, env: RuntimeEnv): Promise<void> {
  if (env.PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER) {
    const outcome = await env.PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER.limit({ key: "public-inquiries" });
    if (!outcome.success) throw new PublicRequestError("Too many requests. Please wait a minute and try again.", 429);
  }
  if (env.PUBLIC_INQUIRY_RATE_LIMITER) {
    const outcome = await env.PUBLIC_INQUIRY_RATE_LIMITER.limit({ key: await rateLimitKey(phone) });
    if (!outcome.success) throw new PublicRequestError("Too many requests. Please wait a minute and try again.", 429);
  }
}

function cloudinaryUrl(value: unknown, cloudName: string): string {
  if (typeof value !== "string") throw new Error("Cloudinary did not return a secure URL");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(`/${cloudName}/image/upload/`)
  ) {
    throw new Error("Cloudinary returned an unexpected delivery URL");
  }
  return url.toString();
}

async function uploadAttachment(
  file: File,
  kind: InquiryKind,
  env: RuntimeEnv,
): Promise<{ publicId: string; url: string }> {
  await verifyImageSignature(file);
  const cloudName = requiredEnv(env, "CLOUDINARY_CLOUD_NAME");
  const apiKey = requiredEnv(env, "CLOUDINARY_API_KEY");
  const apiSecret = requiredEnv(env, "CLOUDINARY_API_SECRET");
  const uploadPreset = requiredEnv(env, "CLOUDINARY_UPLOAD_PRESET");
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `rupantar-homes/inquiries/${kind}-${crypto.randomUUID()}`;
  const parameters = {
    overwrite: "false",
    public_id: publicId,
    timestamp,
    upload_preset: uploadPreset,
  };
  const signature = await cloudinarySignature(parameters, apiSecret);
  const body = new FormData();
  body.set("api_key", apiKey);
  body.set("file", file, file.name);
  body.set("overwrite", "false");
  body.set("public_id", publicId);
  body.set("signature", signature);
  body.set("timestamp", String(timestamp));
  body.set("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: "POST", body },
  );
  let result: CloudinaryUpload | null = null;
  try {
    result = (await response.json()) as CloudinaryUpload;
  } catch {
    // Validation below handles an unreadable response.
  }
  if (!response.ok) {
    const detail = typeof result?.error?.message === "string" ? result.error.message : `status ${response.status}`;
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  try {
    const width = Number(result?.width);
    const height = Number(result?.height);
    const bytes = Number(result?.bytes);
    if (result?.format !== "webp" || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || !Number.isSafeInteger(bytes)) {
      throw new Error("Cloudinary returned incomplete image metadata");
    }
    if (width <= 0 || height <= 0 || bytes <= 0 || width > 1920 || height > 1920 || Math.min(width, height) > 1080) {
      throw new Error("Cloudinary did not create the required 1080p WebP image");
    }
    if (result?.public_id !== publicId) throw new Error("Cloudinary returned an unexpected public ID");
    return { publicId, url: cloudinaryUrl(result.secure_url, cloudName) };
  } catch (error) {
    try {
      await destroyCloudinaryImage(publicId, env);
    } catch (cleanupError) {
      console.error(JSON.stringify({ message: "invalid public inquiry upload cleanup failed", error: errorMessage(cleanupError) }));
    }
    throw error;
  }
}

async function insertInquiry(kind: InquiryKind, payload: InquiryPayload): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_public_inquiry`, {
    method: "POST",
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      p_kind: kind,
      p_name: payload.name,
      p_phone: payload.phone,
      p_category: payload.category,
      p_message: payload.message,
      p_attachment_public_id: payload.attachment_public_id,
      p_attachment_url: payload.attachment_url,
      p_location: payload.location,
      p_approximate_size: payload.approximate_size,
      p_material_preference: payload.material_preference,
    }),
  });
  const responseBody = await response.text();
  if (!response.ok) {
    console.error(JSON.stringify({ message: "Supabase inquiry RPC failed", status: response.status, responseBody }));
    throw new Error(`Supabase inquiry RPC failed with status ${response.status}`);
  }
}

async function sendWeb3FormsNotification(kind: InquiryKind, payload: InquiryPayload): Promise<void> {
  const notification: Record<string, string> = {
    access_key: web3FormsAccessKey,
    subject: kind === "estimate" ? "New Rupantar Homes Estimate Lead" : "New Rupantar Homes Website Query",
    from_name: "Rupantar Homes Website",
    form_type: kind === "estimate" ? "Estimate Request" : "Website Query",
    name: payload.name ?? "",
    phone: payload.phone ?? "",
    service: payload.category ?? "",
    message: payload.message ?? "",
  };

  if (kind === "estimate") {
    notification.location = payload.location ?? "";
    notification.approximate_size = payload.approximate_size ?? "";
    notification.material_preference = payload.material_preference ?? "";
    notification.photo_url = payload.attachment_url ?? "";
  }

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(notification),
  });

  let result: Web3FormsResult | null = null;
  try {
    result = (await response.json()) as Web3FormsResult;
  } catch {
    // The status check below still handles an unreadable response.
  }

  if (!response.ok || result?.success !== true) {
    const detail = typeof result?.message === "string" ? result.message : `status ${response.status}`;
    throw new Error(`Web3Forms notification failed: ${detail}`);
  }
}

export const onRequestPost: PagesFunction<RuntimeEnv> = async ({ request, env }) => {
  const requestId = crypto.randomUUID();
  let uploadedPublicId: string | null = null;

  try {
    requireSameOrigin(request);
    const contentLengthHeader = request.headers.get("Content-Length");
    const contentLength = contentLengthHeader == null ? 0 : Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maximumRequestBytes) {
      throw new PublicRequestError("Request is too large.", 413);
    }
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data")) {
      throw new PublicRequestError("Invalid request format.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new PublicRequestError("Invalid request form.");
    }

    const kind = inquiryKind(form);
    const name = textField(form, "name", "Name", 150);
    const phone = textField(form, "phone", "Phone", 40);
    const normalizedCategory = category(form);
    const message = textField(form, "message", "Message / Requirements", 4000);
    if (!/^[0-9+()\-\s]{5,40}$/.test(phone)) throw new PublicRequestError("Please enter a valid phone number.");
    await enforceOptionalRateLimits(phone, env);

    const photo = attachment(form, kind === "estimate");
    const uploaded = photo ? await uploadAttachment(photo, kind, env) : null;
    uploadedPublicId = uploaded?.publicId ?? null;

    const common: InquiryPayload = {
      name,
      phone,
      category: normalizedCategory,
      message,
      attachment_public_id: uploaded?.publicId ?? null,
      attachment_url: uploaded?.url ?? null,
    };
    const payload: InquiryPayload = kind === "query"
      ? common
      : {
          ...common,
          location: textField(form, "location", "Location", 200),
          approximate_size: textField(form, "approximate_size", "Approximate size", 100),
          material_preference: textField(form, "material_preference", "Material preference", 200),
        };

    await insertInquiry(kind, payload);

    try {
      await sendWeb3FormsNotification(kind, payload);
    } catch (notificationError) {
      console.error(JSON.stringify({
        message: "Web3Forms notification failed after inquiry save",
        requestId,
        kind,
        error: errorMessage(notificationError),
      }));
    }

    console.log(JSON.stringify({ message: "public inquiry accepted", requestId, kind, attachment: Boolean(uploaded) }));
    return json({ ok: true }, 201);
  } catch (error) {
    const message = errorMessage(error);
    const status = error instanceof PublicRequestError ? error.status : 500;
    if (uploadedPublicId) {
      try {
        await destroyCloudinaryImage(uploadedPublicId, env);
      } catch (cleanupError) {
        console.error(JSON.stringify({
          message: "public inquiry attachment cleanup failed",
          requestId,
          error: errorMessage(cleanupError),
        }));
      }
    }
    console.error(JSON.stringify({ message: "public inquiry rejected", requestId, status, error: message }));
    return json({ error: status < 500 ? message : "Your request could not be sent. Please try again." }, status);
  }
};
