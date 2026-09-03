import { getAccessToken } from "./supabase";
import type { WorkImage } from "./types";

type SignatureResponse = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  assetFolder: string;
  publicId: string;
  format: "webp";
  transformation: string;
};

type UploadResponse = {
  secure_url?: unknown;
  public_id?: unknown;
  width?: unknown;
  height?: unknown;
  bytes?: unknown;
  format?: unknown;
  error?: { message?: unknown };
};

const allowedTypes = new Set(["image/jpeg", "image/png"]);
const maximumBytes = 10 * 1024 * 1024;
export const maximumWorkImages = 6;
const deleteBatchSize = 20;
const cloudinaryApiBase = (import.meta.env.VITE_CLOUDINARY_API_BASE || "https://api.cloudinary.com").replace(/\/$/, "");
const workDraftIdPattern = /^rupantar-homes\/works\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new Error("Request timed out.")), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(body: unknown, fallback: string): string {
  if (!isRecord(body)) return fallback;
  const error = body.error;
  if (typeof error === "string" && error.trim()) return error;
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

async function adminRequest(path: string, init: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetchWithTimeout(path, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }, 15_000);
}

function parseSignature(body: unknown): SignatureResponse {
  if (!isRecord(body)) throw new Error("The image upload authorization was invalid.");
  const signature = nonEmptyString(body.signature);
  const apiKey = nonEmptyString(body.apiKey);
  const cloudName = nonEmptyString(body.cloudName);
  const assetFolder = nonEmptyString(body.assetFolder);
  const publicId = nonEmptyString(body.publicId);
  const format = nonEmptyString(body.format);
  const transformation = nonEmptyString(body.transformation);
  const timestamp = positiveInteger(body.timestamp);
  if (!signature || !apiKey || !cloudName || !assetFolder || !publicId || !timestamp || format !== "webp" || !transformation) {
    throw new Error("The image upload authorization was incomplete.");
  }
  if (!/^[a-z0-9_-]+$/i.test(cloudName)) throw new Error("The Cloudinary cloud name was invalid.");
  if (assetFolder !== "rupantar-homes/works" || !workDraftIdPattern.test(publicId)) {
    throw new Error("The image upload authorization returned an invalid storage path.");
  }
  return { signature, timestamp, apiKey, cloudName, assetFolder, publicId, format, transformation };
}

async function requestUploadSignature(): Promise<SignatureResponse> {
  const response = await adminRequest("/api/cloudinary-signature", { method: "POST", body: "{}" });
  const body = await readJson(response);
  if (!response.ok) throw new Error(responseError(body, "Unable to authorize the image upload."));
  return parseSignature(body);
}

function validateUploadedImage(uploaded: UploadResponse, signed: SignatureResponse, file: File, sortOrder: number): WorkImage {
  const secureUrl = nonEmptyString(uploaded.secure_url);
  const publicId = nonEmptyString(uploaded.public_id);
  const format = nonEmptyString(uploaded.format)?.toLowerCase();
  const width = positiveInteger(uploaded.width);
  const height = positiveInteger(uploaded.height);
  const bytes = positiveInteger(uploaded.bytes);
  if (!secureUrl || !publicId) throw new Error(`Cloudinary did not store ${file.name} correctly.`);
  if (publicId !== signed.publicId) throw new Error("Cloudinary returned an unexpected Work image ID.");
  if (format !== "webp") throw new Error(`${file.name} was not converted to WebP.`);
  if (!width || !height || !bytes) throw new Error(`${file.name} returned incomplete image details.`);
  if (width > 1920 || height > 1080) {
    throw new Error(`${file.name} was not reduced to the approved 1080p dimensions.`);
  }

  let url: URL;
  try {
    url = new URL(secureUrl);
  } catch {
    throw new Error("Cloudinary returned an invalid image URL.");
  }
  const expectedPath = `/${signed.cloudName}/image/upload/`;
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(expectedPath)) {
    throw new Error("Cloudinary returned an image URL outside the approved account.");
  }

  return {
    id: crypto.randomUUID(),
    url: secureUrl,
    publicId,
    altText: file.name.replace(/\.[^.]+$/, ""),
    sortOrder,
    width,
    height,
    bytes,
  };
}

async function uploadOne(file: File, sortOrder: number): Promise<WorkImage> {
  const signed = await requestUploadSignature();
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signed.apiKey);
  body.set("timestamp", String(signed.timestamp));
  body.set("signature", signed.signature);
  body.set("asset_folder", signed.assetFolder);
  body.set("public_id", signed.publicId);
  body.set("format", signed.format);
  body.set("transformation", signed.transformation);

  const response = await fetchWithTimeout(`${cloudinaryApiBase}/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, {
    method: "POST",
    body,
  }, 45_000);
  const uploaded = (await readJson(response)) as UploadResponse | null;
  if (!response.ok || !uploaded || uploaded.error) {
    try {
      await deleteCloudinaryImages([signed.publicId]);
    } catch (cleanupError) {
      console.error("Unable to reconcile a failed Cloudinary Work upload", cleanupError);
    }
    throw new Error(responseError(uploaded, `Unable to upload ${file.name}.`));
  }

  try {
    return validateUploadedImage(uploaded, signed, file, sortOrder);
  } catch (error) {
    try {
      await deleteCloudinaryImages([signed.publicId]);
    } catch (cleanupError) {
      console.error("Unable to clean up a rejected Cloudinary upload", cleanupError);
    }
    throw error;
  }
}

export async function uploadWorkImages(files: File[]): Promise<WorkImage[]> {
  if (files.length > maximumWorkImages) {
    throw new Error(`A work can include up to ${maximumWorkImages} images.`);
  }
  for (const file of files) {
    if (!allowedTypes.has(file.type)) throw new Error(`${file.name} must be a JPEG or PNG image.`);
    if (file.size <= 0) throw new Error(`${file.name} is empty.`);
    if (file.size > maximumBytes) throw new Error(`${file.name} is larger than Cloudinary's 10MB image limit.`);
  }

  const uploaded: WorkImage[] = [];
  try {
    for (const [index, file] of files.entries()) {
      uploaded.push(await uploadOne(file, index));
    }
    return uploaded;
  } catch (uploadError) {
    try {
      await deleteCloudinaryImages(uploaded.map((image) => image.publicId));
    } catch (cleanupError) {
      console.error("Unable to roll back a partially completed Cloudinary upload", cleanupError);
      throw new Error(`${uploadError instanceof Error ? uploadError.message : "Image upload failed."} Some uploaded images may need automatic cleanup on the next Admin session.`);
    }
    throw uploadError;
  }
}

export async function deleteCloudinaryImages(publicIds: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(publicIds.map((publicId) => publicId.trim()).filter((publicId) => publicId.length > 0 && publicId.length <= 255)),
  );
  for (let index = 0; index < normalized.length; index += deleteBatchSize) {
    const batch = normalized.slice(index, index + deleteBatchSize);
    const response = await adminRequest("/api/cloudinary-delete", {
      method: "POST",
      body: JSON.stringify({ publicIds: batch }),
    });
    const body = await readJson(response);
    if (!response.ok) {
      throw new Error(responseError(body, "The stored images could not be removed from Cloudinary."));
    }
  }
}
