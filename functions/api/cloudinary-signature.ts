import { requireAdmin } from "../_lib/admin-auth";
import { cloudinarySignature } from "../_lib/cloudinary";
import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { errorMessage, json } from "../_lib/http";

const workImageAssetFolder = "rupantar-homes/works";
const workImageTransformation = "c_limit,h_1080,w_1920/q_auto:good";

export const onRequestPost: PagesFunction<RuntimeEnv> = async ({ request, env }) => {
  try {
    const runtime = requireRuntimeEnv(env);
    await requireAdmin(request, runtime);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await cloudinarySignature(
      {
        asset_folder: workImageAssetFolder,
        format: "webp",
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
