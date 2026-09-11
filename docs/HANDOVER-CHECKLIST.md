# Rupantar Homes Handover Checklist

Use this checklist at the actual ownership-transfer meeting. Do not paste passwords, API secrets, recovery codes, private keys, or service-role credentials into this file.

## 1. Production identity

- [ ] Confirm live domain: `rupantarhomes.com`
- [ ] Confirm GitHub repository: `rupantarhomes/rupantarhomes`
- [ ] Confirm default branch: `main`
- [ ] Confirm accepted runtime baseline: `1bcb53271caefa8227a6839078015d826423bbd4`
- [ ] Confirm exact final deployed `main` SHA from the final handover transfer record
- [ ] Confirm `Protect main` ruleset remains active
- [ ] Confirm required checks remain `Build and tests` and `Cloudflare Pages`

## 2. GitHub access

- [ ] Receiving owner can log in independently
- [ ] Receiving owner has the required repository administration access
- [ ] Pull-request workflow is understood
- [ ] Production-lock manifest/checker is understood
- [ ] No production secrets exist in repository files or commit history introduced during transfer

## 3. Cloudflare access

- [ ] Receiving owner can open the Rupantar Homes Pages project
- [ ] Production deployment is connected to `main`
- [ ] Custom domain/DNS ownership is confirmed
- [ ] Build variables are present
- [ ] Pages Function runtime variables/secrets are present
- [ ] Deployment history and logs are accessible
- [ ] Latest production deployment is healthy

## 4. Supabase access

- [ ] Receiving owner can open project `gmtdqeskyvdvyibccxwt`
- [ ] Project status is healthy
- [ ] Auth settings are accessible
- [ ] Database tables/data are accessible
- [ ] RLS/policies/RPCs/functions are accessible
- [ ] Admin membership can be inspected safely
- [ ] Edge Functions and logs are accessible
- [ ] Backup/export responsibility is assigned
- [ ] Current security-advisor findings have been reviewed rather than blindly changed

## 5. Cloudinary access

- [ ] Receiving owner can log in independently
- [ ] Correct cloud/account is confirmed
- [ ] `rupantar-homes/works` assets are visible
- [ ] Inquiry media path is visible where applicable
- [ ] API usage/billing controls are accessible
- [ ] Signed upload preset/contract is preserved
- [ ] Reference-safe cleanup rules are understood

## 6. Web3Forms and domain ownership

- [ ] Web3Forms account/key ownership is confirmed
- [ ] Receiving owner understands Web3Forms is notification-only, not the data source of truth
- [ ] Domain registrar ownership is confirmed if separate from Cloudflare
- [ ] Domain renewal/contact email belongs to the intended long-term owner

## 7. Production Admin

- [ ] Receiving owner can log in to the production Admin portal
- [ ] Recovery path is tested and documented outside the repository
- [ ] Unauthorized/non-admin access remains denied
- [ ] Admin Works, Blogs, Leads, Reviews and Settings load correctly
- [ ] Admin Work image preview/viewer still works where explicitly used

## 8. Live smoke test

- [ ] Homepage loads on desktop
- [ ] Homepage loads on mobile
- [ ] Navigation/header/footer work
- [ ] Recent Works shows live saved projects
- [ ] Returning from a Work detail page keeps confirmed live Recent Works
- [ ] Work card -> detail navigation works
- [ ] Work detail page does not show the dedicated `Back to Works` control
- [ ] Work detail front gallery is a true `9:16` portrait frame on mobile
- [ ] Work detail front gallery is a true `9:16` portrait frame with controlled existing gallery width on desktop
- [ ] Tapping/clicking the Work detail front image does not open a fullscreen/black-background viewer
- [ ] Tapping the front image does not create a pressed, scale, zoom or pop response
- [ ] Manual mobile swipe works normally
- [ ] Manual desktop pointer drag works normally
- [ ] Multi-image Work galleries hold each image for 2 seconds before advancing forward automatically
- [ ] Automatic transitions use the smooth premium horizontal slide and advance one image at a time
- [ ] Manual interaction resets the autoplay timer instead of fighting the user
- [ ] Pagination dots follow the active image and remain manually selectable
- [ ] Swipe hint remains visible for multi-image galleries
- [ ] Autoplay pauses while the browser tab is hidden
- [ ] Reduced-motion preference disables automatic motion
- [ ] Work image order and smart preload/decode behavior remain intact
- [ ] Work detail category badge is a fully filled solid dark gray (`#3f3f46`) box with white text on mobile and desktop
- [ ] Work detail location badge remains unchanged
- [ ] Work detail `Project Overview` heading is brand red (`#FF1A3D`) and its body paragraph is black (`#18181b`)
- [ ] Work detail `Details` heading is brand red (`#FF1A3D`) and its body paragraph is black (`#18181b`)
- [ ] All Works filters/pagination work
- [ ] Blog listing/detail navigation works
- [ ] Reviews render correctly
- [ ] About/Contact/Privacy/Interior pages load
- [ ] Browser refresh/back/forward works on valid routes
- [ ] `/api/health` returns HTTP 200

## 9. Disposable write test

Only use clearly disposable records/media and remove them after verification.

- [ ] Submit one Query; confirm exactly one Query + Lead
- [ ] Submit one Estimate; confirm exactly one Estimate + Lead
- [ ] Confirm Admin sees both
- [ ] Create/update/delete one disposable Work
- [ ] Verify Work image upload/retain/remove/cancel behavior
- [ ] Create/update/delete one disposable Blog
- [ ] Create/delete one disposable Review
- [ ] Update one disposable Lead status
- [ ] Confirm Settings save only after live Settings loaded
- [ ] Confirm View Site/Logout returns to a fresh public load

## 10. Backup and recovery

- [ ] At least one current off-platform database export exists
- [ ] At least two recent dated exports are retained where required by the runbook
- [ ] Backup location is accessible to the receiving owner
- [ ] No secrets are stored inside backup archives or this repository
- [ ] Restore procedure in `docs/PRODUCTION-OPERATIONS.md` is understood
- [ ] Cloudinary backup/account policy is understood
- [ ] Incident rollback uses a reviewed revert PR, not force-push/hot editing

## 11. Credentials rotation

Rotate only after receiving-owner access is proven. Rotate one integration at a time and smoke-test between rotations.

- [ ] Supabase/server credentials reviewed
- [ ] Public-inquiry internal secret/hash pair reviewed
- [ ] Cloudinary credentials reviewed
- [ ] Web3Forms key reviewed
- [ ] Any outgoing-user personal recovery methods removed only after replacement access is verified

## 12. Acceptance

- [ ] Receiving owner has independent access to every required provider
- [ ] Required production checks are green
- [ ] Live smoke test passed
- [ ] Disposable write test passed or explicitly deferred with owner sign-off
- [ ] Backup responsibility accepted
- [ ] Recovery procedure accepted
- [ ] Exact final deployed `main` SHA recorded in the transfer record

When every applicable item is checked, the technical handover is complete.
