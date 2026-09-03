import { requireAdmin } from "../_lib/admin-auth";
import { cloudinarySignature } from "../_lib/cloudinary";
import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { errorMessage, fetchWithTimeout, json } from "../_lib/http";

const workImageAssetFolder = "rupantar-homes/works";
const workImageTransformation = "c_limit,h_1080,w_1920/q_auto:good";

async function registerDraftImage(publicId: string, request: Request, runtime: RuntimeEnv): Promise<void> {
  const authorization = request.headers.get("Authorization") ?? "";
  const response = await fetchWithTimeout(`${runtime.SUPABASE_URL}/rest/v1/rpc/register_cloudinary_draft_image`, {
    method: "POST",
    headers: {
      apikey: runtime.SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_public_id: publicId }),
  }, 10_000);
  if (!response.ok) throw new Error("Unable to register the image upload draft.");
}

export const onRequestPost: PagesFunction<RuntimeEnv> = async ({ request, env }) => {
  try {
    const runtime = requireRuntimeEnv(env);
    await requireAdmin(request, runtime);
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${workImageAssetFolder}/${crypto.randomUUID()}`;
    await registerDraftImage(publicId, request, runtime);

    const signature = await cloudinarySignature(
      {
        asset_folder: workImageAssetFolder,
        format: "webp",
        public_id: publicId,
        timestamp,
        transformation: workImageTransformation,
      },
      runtime.CLOUDINARY_API_SECRET,
    );

    return json({
      signature,
      timestamp,
      apiKey: runtime.CLOUDINARY_API_KEY,
      cloudName: runtime.CLOUDINARY_CLOUD_NAME,
      assetFolder: workImageAssetFolder,
      publicId,
      format: "webp",
      transformation: workImageTransformation,
    });
  } catch (error) {
    const message = errorMessage(error);
    const status = message === "Unauthorized" ? 401 : 500;
    console.error(JSON.stringify({ message: "cloudinary signature failed", error: message }));
    return json({ error: status === 401 ? "Unauthorized" : "Unable to authorize upload" }, status);
  }
};
