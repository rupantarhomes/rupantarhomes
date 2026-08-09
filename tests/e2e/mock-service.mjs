import { createServer } from "node:http";

const port = Number(process.env.E2E_MOCK_PORT || 54322);
const adminId = "00000000-0000-4000-8000-000000000001";
const accessToken = "mock-admin-access-token";
const refreshToken = "mock-admin-refresh-token";
const publishableKey = "sb_publishable_step_7";
const cloudName = "mock-cloud";

const now = () => new Date().toISOString();
let nextWorkId = 2;
let nextImageId = 2;
let nextReviewId = 2;
let nextQueryId = 1;
let nextEstimateId = 1;
let nextUploadId = 1;

const state = {
  works: [
    {
      id: 1,
      title: "E2E Existing Kitchen",
      slug: "e2e-existing-kitchen",
      category: "modular-kitchen",
      location: "Kathmandu",
      short_description: "Existing test work",
      long_description: "Existing work used by the isolated Step 7 test.",
      featured: true,
      created_at: now(),
      updated_at: now(),
    },
  ],
  work_images: [
    {
      id: 1,
      work_id: 1,
      secure_url: `https://res.cloudinary.com/${cloudName}/image/upload/v1/existing.webp`,
      cloudinary_public_id: "rupantar-homes/works/existing",
      alt_text: "Existing kitchen",
      sort_order: 0,
      width: 1920,
      height: 1080,
      byte_size: 410000,
      created_at: now(),
    },
  ],
  reviews: [
    {
      id: 1,
      name: "Existing Reviewer",
      location: "Lalitpur",
      message: "The isolated test review is visible.",
      rating: 5,
      instagram_url: "https://www.instagram.com/",
      created_at: now(),
    },
  ],
  site_settings: {
    id: 1,
    slogan: "Existing E2E slogan",
    phone: "+977 9800000000",
    instagram_url: "https://www.instagram.com/",
    tiktok_url: "https://www.tiktok.com/",
    address: "Kathmandu, Nepal",
    workshop_note: "Existing E2E workshop",
    updated_at: now(),
  },
  queries: [],
  estimate_requests: [],
  deletedCloudinaryIds: [],
  uploads: [],
  requestLog: [],
};

function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, apikey, content-type, prefer, range, x-client-info, accept-profile, content-profile, x-supabase-api-version",
    "access-control-allow-methods": "GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS",
    "access-control-expose-headers": "content-range, location",
    ...extra,
  };
}

function send(response, status, body = null, headers = {}) {
  const payload = body == null ? "" : JSON.stringify(body);
  response.writeHead(status, corsHeaders({
    ...(payload ? { "content-type": "application/json" } : {}),
    "content-length": Buffer.byteLength(payload),
    ...headers,
  }));
  response.end(payload);
}

async function jsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function multipartBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const contentType = String(request.headers["content-type"] || "");
  return new Response(Buffer.concat(chunks), { headers: { "content-type": contentType } }).formData();
}

function isAdmin(request) {
  return request.headers.authorization === `Bearer ${accessToken}`;
}

function requireAdmin(request, response) {
  if (isAdmin(request)) return true;
  send(response, 401, { code: "PGRST301", message: "Admin authentication required." });
  return false;
}

function wantsObject(request) {
  return String(request.headers.accept || "").includes("application/vnd.pgrst.object+json");
}

function selectedFields(row, url) {
  const select = url.searchParams.get("select");
  if (!select || select === "*") return row;
  return Object.fromEntries(select.split(",").filter((key) => key in row).map((key) => [key, row[key]]));
}

function filteredRows(table, url) {
  let rows = table.map((row) => ({ ...row }));
  for (const [key, value] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (value.startsWith("eq.")) rows = rows.filter((row) => String(row[key]) === value.slice(3));
  }
  const order = url.searchParams.get("order");
  if (order) {
    const [field, direction] = order.split(".");
    rows.sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? "")) * (direction === "desc" ? -1 : 1));
  }
  return rows.map((row) => selectedFields(row, url));
}

function restTable(pathname) {
  return pathname.slice("/rest/v1/".length);
}

async function handleAuth(request, response, url) {
  if (url.pathname === "/auth/v1/token" && request.method === "POST") {
    const body = await jsonBody(request);
    if (url.searchParams.get("grant_type") === "password") {
      if (body?.email !== "admin@rupantar.test" || body?.password !== "ValidPass123!") {
        send(response, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
        return;
      }
      const user = { id: adminId, email: body.email, role: "authenticated", aud: "authenticated", user_metadata: {} };
      send(response, 200, {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      });
      return;
    }
    if (url.searchParams.get("grant_type") === "refresh_token" && body?.refresh_token === refreshToken) {
      const user = { id: adminId, email: "admin@rupantar.test", role: "authenticated", aud: "authenticated", user_metadata: {} };
      send(response, 200, { access_token: accessToken, refresh_token: refreshToken, token_type: "bearer", expires_in: 3600, user });
      return;
    }
  }
  if (url.pathname === "/auth/v1/user" && request.method === "GET") {
    if (!requireAdmin(request, response)) return;
    send(response, 200, { id: adminId, email: "admin@rupantar.test", role: "authenticated", aud: "authenticated", user_metadata: {} });
    return;
  }
  if (url.pathname === "/auth/v1/logout" && request.method === "POST") {
    send(response, 204);
    return;
  }
  send(response, 404, { message: "Unknown auth route" });
}

async function handleRpc(request, response, url) {
  if (!requireAdmin(request, response)) return;
  const name = url.pathname.slice("/rest/v1/rpc/".length);
  const body = await jsonBody(request);
  if (name === "save_work_with_images") {
    const id = body?.p_work_id == null ? nextWorkId++ : Number(body.p_work_id);
    const row = {
      id,
      title: body.p_title,
      slug: body.p_slug,
      category: body.p_category,
      location: body.p_location,
      short_description: body.p_short_description,
      long_description: body.p_long_description,
      featured: Boolean(body.p_featured),
      created_at: state.works.find((work) => work.id === id)?.created_at || now(),
      updated_at: now(),
    };
    const existing = state.works.findIndex((work) => work.id === id);
    if (existing >= 0) state.works[existing] = row;
    else state.works.push(row);
    state.work_images = state.work_images.filter((image) => image.work_id !== id);
    for (const [sortOrder, image] of (body.p_images || []).entries()) {
      state.work_images.push({
        id: nextImageId++,
        work_id: id,
        secure_url: image.secure_url,
        cloudinary_public_id: image.cloudinary_public_id,
        alt_text: image.alt_text,
        sort_order: sortOrder,
        width: image.width,
        height: image.height,
        byte_size: image.byte_size,
        created_at: now(),
      });
    }
    send(response, 200, id);
    return;
  }
  if (name === "delete_work_with_images") {
    const id = Number(body?.p_work_id);
    const publicIds = state.work_images.filter((image) => image.work_id === id).map((image) => image.cloudinary_public_id);
    state.work_images = state.work_images.filter((image) => image.work_id !== id);
    state.works = state.works.filter((work) => work.id !== id);
    send(response, 200, publicIds);
    return;
  }
  send(response, 404, { message: "Unknown RPC" });
}

async function handleRest(request, response, url) {
  const name = restTable(url.pathname);
  if (name === "admin_users") {
    if (!requireAdmin(request, response)) return;
    const row = selectedFields({ user_id: adminId, is_active: true, created_at: now() }, url);
    send(response, 200, wantsObject(request) ? row : [row]);
    return;
  }

  const table = state[name];
  if (table == null) {
    send(response, 404, { code: "PGRST205", message: `Unknown table ${name}` });
    return;
  }

  if (request.method === "HEAD") {
    if (!requireAdmin(request, response)) return;
    const count = Array.isArray(table) ? table.length : table ? 1 : 0;
    send(response, 200, null, { "content-range": count ? `0-${count - 1}/${count}` : "*/0" });
    return;
  }

  if (request.method === "GET") {
    const rows = Array.isArray(table) ? filteredRows(table, url) : filteredRows([table], url);
    send(response, 200, wantsObject(request) ? rows[0] ?? null : rows);
    return;
  }

  const adminWrite = ["works", "work_images", "reviews", "site_settings"].includes(name);
  if (adminWrite && !requireAdmin(request, response)) return;
  if (["queries", "estimate_requests"].includes(name) && ![publishableKey, accessToken].includes(String(request.headers.apikey))) {
    send(response, 401, { message: "Publishable key required." });
    return;
  }

  if (request.method === "POST") {
    const body = await jsonBody(request);
    if (name === "reviews") {
      const row = { ...body, id: nextReviewId++, created_at: now() };
      state.reviews.push(row);
      send(response, 201, wantsObject(request) ? selectedFields(row, url) : [selectedFields(row, url)]);
      return;
    }
    if (name === "site_settings") {
      state.site_settings = { ...state.site_settings, ...body, updated_at: now() };
      send(response, 201, wantsObject(request) ? selectedFields(state.site_settings, url) : [selectedFields(state.site_settings, url)]);
      return;
    }
    if (name === "queries") {
      state.queries.push({ ...body, id: nextQueryId++, created_at: now() });
      send(response, 201);
      return;
    }
    if (name === "estimate_requests") {
      state.estimate_requests.push({ ...body, id: nextEstimateId++, created_at: now() });
      send(response, 201);
      return;
    }
  }

  if (request.method === "DELETE" && name === "reviews") {
    const id = Number(String(url.searchParams.get("id") || "").replace(/^eq\./, ""));
    const removed = state.reviews.find((review) => review.id === id);
    state.reviews = state.reviews.filter((review) => review.id !== id);
    const selected = removed ? selectedFields(removed, url) : null;
    send(response, 200, wantsObject(request) ? selected : selected ? [selected] : []);
    return;
  }

  send(response, 405, { message: `Unsupported ${request.method} on ${name}` });
}

async function handleCloudinaryApi(request, response, url) {
  if (url.pathname === "/api/inquiries" && request.method === "POST") {
    const form = await multipartBody(request);
    const kind = form.get("kind");
    const attached = form.get("attachment");
    const attachmentPublicId = attached instanceof File && attached.size > 0
      ? `rupantar-homes/inquiries/${kind}-e2e-${nextUploadId++}`
      : null;
    const row = {
      name: form.get("name"),
      phone: form.get("phone"),
      category: form.get("category"),
      message: form.get("message"),
      attachment_public_id: attachmentPublicId,
      attachment_url: attachmentPublicId
        ? `https://res.cloudinary.com/${cloudName}/image/upload/v1/${attachmentPublicId}.webp`
        : null,
      created_at: now(),
    };
    if (kind === "estimate") {
      state.estimate_requests.push({
        ...row,
        id: nextEstimateId++,
        location: form.get("location"),
        approximate_size: form.get("approximate_size"),
        material_preference: form.get("material_preference"),
      });
    } else if (kind === "query") {
      state.queries.push({ ...row, id: nextQueryId++ });
    } else {
      send(response, 400, { error: "Invalid request type." });
      return;
    }
    send(response, 201, { ok: true });
    return;
  }
  if (url.pathname === "/api/cloudinary-signature" && request.method === "POST") {
    if (!requireAdmin(request, response)) return;
    send(response, 200, { signature: "mock-signature", timestamp: Math.floor(Date.now() / 1000), apiKey: "mock-api-key", cloudName, uploadPreset: "rupantar_works_signed" });
    return;
  }
  if (url.pathname === "/api/cloudinary-delete" && request.method === "POST") {
    if (!requireAdmin(request, response)) return;
    const body = await jsonBody(request);
    const publicIds = Array.isArray(body?.publicIds) ? body.publicIds : [];
    state.deletedCloudinaryIds.push(...publicIds);
    send(response, 200, { deleted: publicIds });
    return;
  }
  if (/^\/cloudinary\/v1_1\/[^/]+\/image\/upload$/.test(url.pathname) && request.method === "POST") {
    const publicId = `rupantar-homes/works/e2e-upload-${nextUploadId++}`;
    const upload = {
      secure_url: `https://res.cloudinary.com/${cloudName}/image/upload/v1/${publicId}.webp`,
      public_id: publicId,
      width: 1920,
      height: 1080,
      bytes: 475000,
      format: "webp",
    };
    state.uploads.push(upload);
    send(response, 200, upload);
    return;
  }
  send(response, 404, { message: "Unknown application API route" });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);
  state.requestLog.push({ method: request.method, path: url.pathname, authorized: isAdmin(request) });
  if (request.method === "OPTIONS") return send(response, 204);
  if (url.pathname === "/__state") return send(response, 200, state);
  if (url.pathname.startsWith("/auth/v1/")) return handleAuth(request, response, url);
  if (url.pathname.startsWith("/rest/v1/rpc/")) return handleRpc(request, response, url);
  if (url.pathname.startsWith("/rest/v1/")) return handleRest(request, response, url);
  return handleCloudinaryApi(request, response, url);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Step 8 mock service listening on http://127.0.0.1:${port}`);
});
