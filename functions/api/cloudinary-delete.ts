import { requireAdmin } from "../_lib/admin-auth";
import { cloudinarySignature } from "../_lib/cloudinary";
import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { errorMessage, json } from "../_lib/http";

type DeleteBody = { publicIds?: unknown };

export const onRequestPost: PagesFunction<RuntimeEnv> = async ({ request, env }) => {
  try {
    const runtime = requireRuntimeEnv(env);
    await requireAdmin(request, runtime);
    const body = (await request.json()) as DeleteBody;
    if (!Array.isArray(body.publicIds) || body.publicIds.length === 0 || body.publicIds.length > 20) {
      return json({ error: "Invalid image list" }, 400);
    }
    const publicIds = body.publicIds.filter(
      (value): value is string => typeof value === "string" && value.length > 0 && value.length <= 255,
    );
    if (publicIds.length !== body.publicIds.length) return json({ error: "Invalid public ID" }, 400);

    const results = await Promise.all(
      publicIds.map(async (publicId) => {
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
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(runtime.CLOUDINARY_CLOUD_NAME)}/image/destroy`,
          { method: "POST", body: form },
        );
        if (!response.ok) throw new Error(`Cloudinary deletion failed with status ${response.status}`);
        return response.json();
      }),
    );

    return json({ results });
  } catch (error) {
    const message = errorMessage(error);
    const status = message === "Unauthorized" ? 401 : 500;
    console.error(JSON.stringify({ message: "cloudinary deletion failed", error: message }));
    return json({ error: status === 401 ? "Unauthorized" : "Unable to delete images" }, status);
  }
};
