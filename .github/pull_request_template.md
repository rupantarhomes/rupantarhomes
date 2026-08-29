## Summary

Describe the requested change and why it is needed.

## Scope

List the files/surfaces intentionally changed.

## Production baseline check

- [ ] This PR starts from the latest protected `main` branch.
- [ ] The change is limited to the requested scope.
- [ ] I reviewed the complete diff for unrelated changes.
- [ ] No production secrets were added to source control.
- [ ] `node scripts/verify-production-lock.mjs` passes, or every intentionally changed production fingerprint is updated only after complete verification.
- [ ] Auth/RLS/Admin authorization is unchanged unless explicitly required by this PR.
- [ ] Cloudinary Work upload/WebP/remove/cancel/update lifecycle is unchanged unless explicitly required by this PR.
- [ ] Public inquiry/form validation, server-side secrets, and rate limiting are unchanged unless explicitly required by this PR.
- [ ] Security headers/CSP/HSTS are unchanged unless explicitly required by this PR.
- [ ] Cloudflare/environment/deployment behavior is unchanged unless explicitly required by this PR.

## Verification

- [ ] `npm run verify` passes.
- [ ] Relevant desktop check completed.
- [ ] Relevant mobile check completed.
- [ ] No new red browser-console runtime errors on the changed surface.
- [ ] If a locked production system changed, I completed its targeted regression from `docs/PRODUCTION-BASELINE.md`.

## Locked-system impact

Does this PR intentionally modify a locked production system or handover fingerprint?

- [ ] No
- [ ] Yes — explain why, blast radius, rollback plan, targeted regression, and the exact `.github/production-lock.json` fingerprint(s) updated below.

### Explanation / rollback / regression evidence

N/A

## Post-merge production smoke test

State what must be checked after Cloudflare deploys the merged `main` commit.
