# Rupantar Homes encrypted backup and restore drill

Accepted operational scope: Rupantar Homes only. This control does not change the public site, Admin UI, Supabase schema/RLS/RPC/Auth behavior, Cloudinary lifecycle, forms, content, or Cloudflare runtime behavior.

## What the workflow now proves

The weekly `Encrypted Supabase Backup` workflow must do all of the following before an artifact is accepted:

1. Require `SUPABASE_DB_URL` and `BACKUP_ENCRYPTION_PASSPHRASE` from GitHub Actions secrets.
2. Export roles, schema, and data with the pinned Supabase CLI `2.117.0`.
3. Verify the three logical dump files are non-empty and contain the expected Works schema/data markers.
4. Start a disposable local Supabase stack on the GitHub runner.
5. Restore `roles.sql`, `schema.sql`, and `data.sql` into the disposable database with `ON_ERROR_STOP=1` in a single transaction.
6. Verify restored core tables are readable and that `works` and `site_settings` contain data.
7. Re-check SHA-256 checksums after the restore drill.
8. Package the logical dumps, checksums, and restore-verification report.
9. Encrypt the package with AES-256-CBC + PBKDF2 (200,000 iterations) before upload.
10. Retain only the encrypted GitHub Actions artifact for 30 days.
11. Stop and delete the disposable local Supabase environment even when the drill fails.
12. Open one recoverable GitHub incident on failure and close it automatically after a later successful run.

## Production safety

The restore target is local and disposable. The workflow never restores into the live Rupantar Homes Supabase project and never issues destructive SQL against production. Production is used only as the read source for the logical export.

## Owner-managed secrets

The two GitHub Actions secrets are intentionally not stored in the repository:

- `SUPABASE_DB_URL`: a valid password-bearing Supabase Postgres connection string for the Rupantar Homes project.
- `BACKUP_ENCRYPTION_PASSPHRASE`: a unique high-entropy passphrase kept outside the repository and required to decrypt recovery artifacts.

The encrypted artifact is not a usable recovery path unless the encryption passphrase is also retained securely by the owner.

## Acceptance

The control is considered operational only after an actual workflow run completes successfully and produces an encrypted artifact after the disposable restore verification. A passing build alone validates configuration and regressions, not the external database credentials.
