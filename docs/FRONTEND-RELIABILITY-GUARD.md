# Rupantar Homes Frontend Reliability Guard

This document defines the mandatory workflow for presentation-only changes after the 2026-09-03 end-to-end reliability hardening.

## Purpose

Frontend design work must be able to improve layout, spacing, typography, colors, responsive presentation, images, hover states, CSS, and motion without accidentally changing the production behavior that powers Admin, Works, Blogs, Leads, Reviews, Settings, forms, navigation, loading/error recovery, or image lifecycle.

## Frontend branch families

Presentation-only pull requests must use one of these branch prefixes:

- `frontend/`
- `ui/`
- `design/`
- `style/`
- `enhancement/`

The Production Baseline workflow automatically applies the frontend-only guards to these branch families.

## Layer 1: file boundary

`scripts/check-ui-enhancement-diff.mjs` permits only the approved presentation surfaces and UI-only CSS/enhancement directories.

A frontend-only branch cannot change backend Functions, Supabase code or migrations, repository/data access, Auth, Cloudinary lifecycle, deployment configuration, dependencies, production guard scripts, or other mixed business-logic files.

If a design request genuinely requires one of those systems to change, stop the frontend-only PR and make a separate reliability-reviewed change.

## Layer 2: behavior boundary

`scripts/check-frontend-behavior-diff.mjs` parses protected React files with the TypeScript compiler and creates a behavior signature for production-sensitive nodes.

The signature protects, among other things:

- event handlers and form submission wiring;
- navigation and callback calls;
- disabled, busy, loading, required, input, link, and accessibility interaction semantics;
- Query and Estimate form wiring;
- Work/Blog card navigation behavior;
- Admin save/delete/upload/logout wiring;
- upload/file acceptance safeguards;
- selected protected validation and reliability helper declarations;
- loading/busy gating expressions.

The signature deliberately ignores ordinary presentation details such as `className`, inline `style`, visual text/copy, spacing, CSS, images, and normal visual markup. Those remain available for frontend design work.

If a frontend-only PR changes a protected behavior signature, CI fails and instructs the developer to split the behavior change into a separate reliability-reviewed PR.

## Guard self-test

Every Production Baseline CI run executes the AST guard's built-in self-test after dependencies are installed. The self-test proves that:

- class/style/copy-only changes do not alter the behavior signature;
- event-handler changes are detected;
- disabled/busy-gate changes are detected.

This prevents the guard from silently becoming ineffective after dependency or TypeScript changes.

## Guard machinery lock

The production handover manifest fingerprints both:

- the complete `scripts/` tree; and
- `.github/workflows/production-baseline.yml`.

Therefore future production changes cannot weaken the guard scripts or CI wiring without an explicit production-lock fingerprint update in a separately reviewed change.

## Required workflow

For every future frontend-only update:

1. Start from the latest protected `main`.
2. Use a recognized frontend branch prefix.
3. Change only approved presentation files.
4. Preserve production behavior signatures.
5. Open a PR to `main`.
6. Require production lock, frontend file boundary, frontend behavior boundary, TypeScript, production build, and regression tests to pass.
7. Review the full diff.
8. Merge only after explicit approval.
9. Smoke-test the changed presentation after Cloudflare deploys the new `main`.

This guard reduces accidental regressions substantially, but it does not replace human review or targeted testing when a change intentionally modifies behavior.
