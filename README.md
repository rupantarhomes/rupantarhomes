# Rupantar Homes

Maintainable source project for the locked Rupantar Homes public website and admin portal.

## Current checkpoint

Step 2 reconstructs the supplied single-file website as maintainable React components while preserving the locked public and admin interface.

- Public home, works, work detail, and about views.
- Admin login, dashboard, works, reviews, and settings views.
- Existing local add, edit, delete, filter, form, and navigation behavior.
- Supplied logo, favicon, founder photo, and exact baseline stylesheet.
- The original HTML remains preserved byte-for-byte as the visual reference.

Supabase, Cloudinary, Cloudflare Pages, secure authentication, deployment, and the custom domain are intentionally not connected at this checkpoint.

## Local commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

The baseline is stored at `public/baseline/rupantar-latest.html`.
