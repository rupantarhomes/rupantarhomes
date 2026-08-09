# Step 9 production release

## Release scope

- Hardened admin authentication and authorization checks.
- Atomic work and work-image save/delete operations.
- Cloudinary signed upload and deletion flow with 1080p WebP normalization.
- Unlimited work-image rows through the normalized `work_images` table.
- Server-side public inquiry endpoints with validation and rate limiting.
- Cloudflare Pages production configuration and generated Worker types.

## Pre-deployment verification

- `pnpm run build`: passed.
- `pnpm run lint`: passed.
- `pnpm test`: passed (9 tests).
- Atomic Supabase work functions applied and permission-checked.
- Required Cloudflare secrets confirmed saved outside source control.

## Release sequence

1. Deploy the application and Pages Functions.
2. Verify `/api/inquiries` is live.
3. Apply `20260809224500_secure_public_inquiries.sql`.
4. Verify public form submissions, admin CRUD, Cloudinary upload/delete, and logout.


