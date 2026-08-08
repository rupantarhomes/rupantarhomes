export type RuntimeEnv = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_UPLOAD_PRESET: string;
};

export function requireRuntimeEnv(env: RuntimeEnv): RuntimeEnv {
  const names: (keyof RuntimeEnv)[] = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_PRESET",
  ];
  for (const name of names) {
    if (!env[name]?.trim()) throw new Error(`Missing Cloudflare environment variable: ${name}`);
  }
  return env;
}
