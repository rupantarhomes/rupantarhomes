import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { errorMessage, fetchWithTimeout, json } from "../_lib/http";

export const onRequestGet: PagesFunction<RuntimeEnv> = async ({ env }) => {
  const startedAt = Date.now();
  try {
    const runtime = requireRuntimeEnv(env);
    const url = new URL(`${runtime.SUPABASE_URL}/rest/v1/site_settings`);
    url.searchParams.set("select", "id");
    url.searchParams.set("id", "eq.1");
    url.searchParams.set("limit", "1");

    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: runtime.SUPABASE_PUBLISHABLE_KEY,
        Accept: "application/json",
      },
    }, 5_000);

    if (!response.ok) throw new Error(`Supabase health check returned ${response.status}`);
    const rows = (await response.json()) as Array<{ id?: unknown }>;
    if (rows.length !== 1 || rows[0]?.id !== 1) throw new Error("Supabase health row is unavailable");

    return json({
      ok: true,
      database: "ok",
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "health check failed", error: errorMessage(error) }));
    return json({
      ok: false,
      database: "unavailable",
      elapsed_ms: Date.now() - startedAt,
    }, 503);
  }
};
