export type RuntimeEnv = Cloudflare.Env & {
  CLOUDINARY_API_SECRET: string;
  SUPABASE_SECRET_KEY?: string;
  PUBLIC_INQUIRY_RATE_LIMITER?: RateLimit;
  PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER?: RateLimit;
};

export type InquiryRuntimeEnv = RuntimeEnv & {
  SUPABASE_SECRET_KEY: string;
  PUBLIC_INQUIRY_RATE_LIMITER: RateLimit;
  PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER: RateLimit;
};

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
  if (!runtime.SUPABASE_SECRET_KEY?.trim()) {
    throw new Error("Missing Cloudflare environment variable: SUPABASE_SECRET_KEY");
  }
  if (!runtime.PUBLIC_INQUIRY_RATE_LIMITER || !runtime.PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER) {
    throw new Error("Missing Cloudflare public inquiry rate-limit bindings");
  }
  return runtime as InquiryRuntimeEnv;
}
