import { getAccessToken } from "./supabase";
import type { WorkImage } from "./types";

type SignatureResponse = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
};

type UploadResponse = {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  error?: { message?: string };
};

const allowedTypes = new Set(["image/jpeg", "image/png"]);
const maximumBytes = 15 * 1024 * 1024;

async function adminRequest(path: string, init: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export async function uploadWorkImages(files: File[]): Promise<WorkImage[]> {
  for (const file of files) {
    if (!allowedTypes.has(file.type)) throw new Error(`${file.name} must be a JPEG or PNG image.`);
    if (file.size > maximumBytes) throw new Error(`${file.name} is larger than 15MB.`);
  }

  const signatureResponse = await adminRequest("/api/cloudinary-signature", {
    method: "POST",
    body: "{}",
  });
  if (!signatureResponse.ok) throw new Error("Unable to authorize the image upload.");
  const signed = (await signatureResponse.json()) as SignatureResponse;

  return Promise.all(
    files.map(async (file, index) => {
      const body = new FormData();
      body.set("file", file);
      body.set("api_key", signed.apiKey);
      body.set("timestamp", String(signed.timestamp));
      body.set("signature", signed.signature);
      body.set("upload_preset", signed.uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, {
        method: "POST",
        body,
      });
      const uploaded = (await response.json()) as UploadResponse;
      if (!response.ok || uploaded.error || !uploaded.secure_url || !uploaded.public_id) {
        throw new Error(uploaded.error?.message ?? `Unable to upload ${file.name}.`);
      }
      if (uploaded.format !== "webp") throw new Error(`${file.name} was not converted to WebP.`);

      const url = new URL(uploaded.secure_url);
      if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
        throw new Error("Cloudinary returned an invalid image URL.");
      }

      return {
        id: crypto.randomUUID(),
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        altText: file.name.replace(/\.[^.]+$/, ""),
        sortOrder: index,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
      };
    }),
  );
}

export async function deleteCloudinaryImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  const response = await adminRequest("/api/cloudinary-delete", {
    method: "POST",
    body: JSON.stringify({ publicIds }),
  });
  if (!response.ok) throw new Error("The work was not deleted because its stored images could not be removed.");
}
