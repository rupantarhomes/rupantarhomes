# Rupantar Homes

Production source for the locked Rupantar Homes public website and admin portal.

The visual structure is preserved from `public/baseline/rupantar-latest.html`. Content and admin actions now use external services instead of browser `localStorage`:

- **Cloudflare Pages** hosts the Vite/React frontend and two protected Pages Functions.
- **Supabase** stores works, normalized work images, reviews, settings, queries, and estimate requests; Supabase Auth provides the admin session.
- **Cloudinary** receives signed admin uploads and stores one optimized WebP master per image.

## Image contract

The signed Cloudinary preset must be named `rupantar_works_signed`, allow only `jpg,jpeg,png`, disable overwrite, and use this incoming transformation:

```text
if_ar_gt_1.0/c_limit,h_1080,w_1920/if_else/c_limit,h_1920,w_1080/if_end/f_webp,q_90,fl_force_strip
```

That preserves aspect ratio, limits landscape images to 1920×1080 and portrait images to 1080×1920, converts to WebP at quality 90, and removes metadata. Gallery slots grow from the normalized `work_images` rows without a fixed maximum.

## Supabase

Follow `supabase/README.md`. The migration explicitly enables RLS and grants only public reads, public form inserts, and authenticated admin writes. Do not put a Supabase secret/service-role key in this repository or in browser variables.

## Cloudflare variables

Build variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Pages Functions runtime variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_UPLOAD_PRESET
```

Encrypted Pages Function secret:

```text
CLOUDINARY_API_SECRET
```

The Cloudinary secret must never be a `VITE_` variable. The browser requests an upload signature from `/api/cloudinary-signature`; that function verifies both the Supabase session and membership in `admin_users` before signing.

## Local commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

Copy `.env.example` to `.env.local` for local public-data testing. Cloudinary upload testing additionally needs the Pages Function runtime variables passed to Wrangler; never commit their real values.
