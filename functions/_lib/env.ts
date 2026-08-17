export type RuntimeEnv = Cloudflare.Env & {
  CLOUDINARY_API_SECRET: string;
  PUBLIC_INQUIRY_INTERNAL_SECRET: string;
  WEB3FORMS_ACCESS_KEY: string;
  PUBLIC_INQUIRY_RATE_LIMITER?: RateLimit;
  PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER?: RateLimit;
};

export type InquiryRuntimeEnv = RuntimeEnv;

export function requireRuntimeEnv(env: RuntimeEnv): RuntimeEnv {
  const names = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_PRESET",
  ] as const;
  for (const name of names) {
    if (!env[name]?.trim()) throw new Error(`Missing Cloudflare environment variable: ${name}`);
  }
  return env;
}

export function requireInquiryRuntimeEnv(env: RuntimeEnv): InquiryRuntimeEnv {
  const runtime = requireRuntimeEnv(env);
  for (const name of ["PUBLIC_INQUIRY_INTERNAL_SECRET", "WEB3FORMS_ACCESS_KEY"] as const) {
    if (!runtime[name]?.trim()) throw new Error(`Missing Cloudflare environment variable: ${name}`);
  }
  return runtime;
}

