interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface EventContext<Env = Cloudflare.Env, Params = Record<string, string>, Data = Record<string, unknown>> {
  request: Request;
  env: Env;
  params: Params;
  data: Data;
  waitUntil(promise: Promise<unknown>): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
}

interface PagesFunction<Env = Cloudflare.Env> {
  (context: EventContext<Env>): Response | Promise<Response>;
}

declare namespace Cloudflare {
  interface Env {
    SUPABASE_URL: string;
    SUPABASE_PUBLISHABLE_KEY: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_UPLOAD_PRESET: string;
  }
}

