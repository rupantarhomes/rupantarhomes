import { requireAdmin } from "../_lib/admin-auth";
import { destroyCloudinaryImage } from "../_lib/cloudinary";
import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { errorMessage, json } from "../_lib/http";

type DeleteBody = { publicIds?: unknown };
function isPublicId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 255;
}

export const onRequestPost: PagesFunction<RuntimeEnv> = async ({ request, env }) => {
  try {
    const runtime = requireRuntimeEnv(env);
    await requireAdmin(request, runtime);

    let body: DeleteBody;
    try {
      body = (await request.json()) as DeleteBody;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!Array.isArray(body.publicIds) || body.publicIds.length === 0 || body.publicIds.length > 20) {
      return json({ error: "Provide between 1 and 20 image IDs" }, 400);
    }
    if (!body.publicIds.every(isPublicId)) return json({ error: "Invalid public ID" }, 400);
    const publicIds = Array.from(new Set(body.publicIds.map((publicId) => publicId.trim())));

    let deleted = 0;
    let notFound = 0;
    for (const publicId of publicIds) {
      const result = await destroyCloudinaryImage(publicId, runtime);
      if (result === "deleted") deleted += 1;
      else notFound += 1;
    }
    return json({ deleted, notFound });
  } catch (error) {
    const message = errorMessage(error);
    const status = message === "Unauthorized" ? 401 : 500;
    console.error(JSON.stringify({ message: "cloudinary deletion failed", error: message }));
    return json({ error: status === 401 ? "Unauthorized" : "Unable to delete images" }, status);
  }
};
