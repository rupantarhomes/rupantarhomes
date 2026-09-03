import type { RuntimeEnv } from "./env";
import { fetchWithTimeout } from "./http";

type SupabaseUser = { id?: string };
type AdminRow = { user_id?: string };

export async function requireAdmin(request: Request, env: RuntimeEnv): Promise<string> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const headers = {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: authorization,
    Accept: "application/json",
  };

  const userResponse = await fetchWithTimeout(`${env.SUPABASE_URL}/auth/v1/user`, { headers }, 10_000);
  if (!userResponse.ok) throw new Error("Unauthorized");
  const user = (await userResponse.json()) as SupabaseUser;
  if (!user.id) throw new Error("Unauthorized");

  const adminUrl = new URL(`${env.SUPABASE_URL}/rest/v1/admin_users`);
  adminUrl.searchParams.set("select", "user_id");
  adminUrl.searchParams.set("user_id", `eq.${user.id}`);
  adminUrl.searchParams.set("limit", "1");
  const adminResponse = await fetchWithTimeout(adminUrl, { headers }, 10_000);
  if (!adminResponse.ok) throw new Error("Unauthorized");
  const rows = (await adminResponse.json()) as AdminRow[];
  if (rows[0]?.user_id !== user.id) throw new Error("Unauthorized");

  return user.id;
}
