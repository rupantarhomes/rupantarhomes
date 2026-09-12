const bootstrapWindow = window;
const preloadedHomeCovers = new Set();

function deliveryUrl(sourceUrl, width) {
  if (typeof sourceUrl !== "string" || !sourceUrl.startsWith("https://res.cloudinary.com/") || !sourceUrl.includes("/image/upload/")) return sourceUrl;
  return sourceUrl.replace("/image/upload/", `/image/upload/c_limit,w_${width}/f_auto/q_auto:good/`);
}

function preloadHomeCovers(payload) {
  if (!payload || !Array.isArray(payload.works)) return payload;

  for (const work of payload.works) {
    const image = work && Array.isArray(work.images) ? work.images[0] : null;
    if (!image || typeof image.url !== "string" || !image.url.startsWith("https://res.cloudinary.com/")) continue;
    if (preloadedHomeCovers.has(image.url)) continue;
    preloadedHomeCovers.add(image.url);

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.fetchPriority = "low";
    link.href = deliveryUrl(image.url, 480);
    link.setAttribute("imagesrcset", [160, 320, 480, 768].map((width) => `${deliveryUrl(image.url, width)} ${width}w`).join(", "));
    link.setAttribute("imagesizes", "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 33vw");
    document.head.appendChild(link);
  }

  return payload;
}

function numeric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function mapDirectHomePayload(results) {
  const worksRows = results[0];
  const reviewRows = results[1];
  const settings = results[2] && results[2][0];
  if (!Array.isArray(worksRows) || !Array.isArray(reviewRows) || !settings) throw new Error("Direct Home bootstrap invalid");

  const works = worksRows.map((work) => ({
    id: String(work.id == null ? "" : work.id),
    title: String(work.title || ""),
    slug: String(work.slug || ""),
    category: String(work.category || ""),
    location: String(work.location || ""),
    shortDesc: String(work.short_description || ""),
    longDesc: String(work.long_description || ""),
    featured: work.featured === true,
    blogUrl: work.blog_url || undefined,
    images: (Array.isArray(work.work_images) ? work.work_images : []).map((image) => ({
      id: String(image.id == null ? "" : image.id),
      workId: String(image.work_id == null ? "" : image.work_id),
      url: String(image.secure_url || ""),
      publicId: String(image.cloudinary_public_id || ""),
      altText: String(image.alt_text || ""),
      sortOrder: numeric(image.sort_order) || 0,
      width: numeric(image.width),
      height: numeric(image.height),
      bytes: numeric(image.byte_size),
    })).sort((left, right) => left.sortOrder - right.sortOrder),
  }));

  const reviews = reviewRows.map((review) => ({
    id: String(review.id == null ? "" : review.id),
    name: String(review.name || ""),
    location: String(review.location || ""),
    message: String(review.message || ""),
    rating: numeric(review.rating) || 5,
    instagramLink: review.instagram_url || undefined,
  }));

  return {
    works,
    reviews,
    settings: {
      slogan: String(settings.slogan || ""),
      phone: String(settings.phone || ""),
      instagram: String(settings.instagram_url || ""),
      tiktok: String(settings.tiktok_url || ""),
      address: String(settings.address || ""),
      workshopNote: String(settings.workshop_note || ""),
    },
    confirmedAt: Date.now(),
  };
}

async function directHomeBootstrap() {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
  const supabaseKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (!supabaseUrl.startsWith("https://") || !supabaseKey) throw new Error("Home bootstrap configuration unavailable");

  const headers = { Accept: "application/json", apikey: supabaseKey };
  const worksSelect = "id,title,slug,category,location,short_description,long_description,featured,blog_url,work_images(id,work_id,secure_url,cloudinary_public_id,alt_text,sort_order,width,height,byte_size)";
  const urls = [
    `${supabaseUrl}/rest/v1/works?select=${encodeURIComponent(worksSelect)}&order=created_at.desc&work_images.order=sort_order.asc&limit=6`,
    `${supabaseUrl}/rest/v1/reviews?select=id,name,location,message,rating,instagram_url&order=created_at.desc`,
    `${supabaseUrl}/rest/v1/site_settings?select=slogan,phone,instagram_url,tiktok_url,address,workshop_note&id=eq.1&limit=1`,
  ];

  const responses = await Promise.all(urls.map(async (url) => {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Direct Home bootstrap unavailable");
    return response.json();
  }));
  return mapDirectHomePayload(responses);
}

async function edgeHomeBootstrap() {
  const response = await fetch("/api/public-home", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Home bootstrap unavailable (${response.status})`);
  return response.json();
}

if (window.location.pathname === "/") {
  try {
    const storedHome = JSON.parse(window.localStorage.getItem("rupantar-home-bootstrap-v1") || "null");
    if (storedHome && typeof storedHome.confirmedAt === "number" && Date.now() - storedHome.confirmedAt <= 86_400_000) {
      preloadHomeCovers(storedHome);
    }
  } catch {
    // Storage is an optional acceleration only.
  }

  bootstrapWindow.__RUPANTAR_HOME_BOOTSTRAP__ = edgeHomeBootstrap()
    .catch(() => directHomeBootstrap())
    .then(preloadHomeCovers);
  bootstrapWindow.__RUPANTAR_HOME_BOOTSTRAP__.catch(() => undefined);
}
