import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("keeps the work-image source and WebP output contract strict", async () => {
  const [client, signature] = await Promise.all([
    read("../app/rupantar/cloudinary.ts"),
    read("../functions/api/cloudinary-signature.ts"),
  ]);

  assert.match(client, /new Set\(\["image\/jpeg", "image\/png"\]\)/);
  assert.doesNotMatch(client, /image\/heic|image\/heif|image\/webp/);
  assert.match(client, /const maximumBytes = 10 \* 1024 \* 1024/);
  assert.match(client, /if \(file\.size <= 0\)/);
  assert.match(client, /file\.size > maximumBytes/);
  assert.match(client, /files\.length > maximumWorkImages/);
  assert.match(client, /body\.set\("asset_folder", signed\.assetFolder\)/);
  assert.match(client, /body\.set\("public_id", signed\.publicId\)/);
  assert.match(client, /body\.set\("format", signed\.format\)/);
  assert.match(client, /body\.set\("transformation", signed\.transformation\)/);
  assert.doesNotMatch(client, /body\.set\("upload_preset"/);
  assert.match(client, /if \(publicId !== signed\.publicId\)/);
  assert.match(client, /if \(format !== "webp"\) throw new Error\(`\$\{file\.name\} was not converted to WebP\.`\);/);
  assert.match(client, /if \(width > 1920 \|\| height > 1080\)/);

  assert.match(signature, /asset_folder: workImageAssetFolder/);
  assert.match(signature, /public_id: publicId/);
  assert.match(signature, /register_cloudinary_draft_image/);
  assert.match(signature, /const publicId = `\$\{workImageAssetFolder\}\/\$\{crypto\.randomUUID\(\)\}`/);
  assert.match(signature, /const workImageAssetFolder = "rupantar-homes\/works"/);
  assert.match(signature, /format: "webp"/);
  assert.match(signature, /c_limit,h_1080,w_1920\/q_auto:good/);
  assert.doesNotMatch(signature, /upload_preset:/);
  assert.doesNotMatch(signature, /f_webp/);
});

test("rejects malformed or untrusted Cloudinary upload responses", async () => {
  const client = await read("../app/rupantar/cloudinary.ts");

  assert.match(client, /if \(!response\.ok \|\| !uploaded \|\| uploaded\.error\)/);
  assert.match(client, /if \(!secureUrl \|\| !publicId\)/);
  assert.match(client, /if \(publicId !== signed\.publicId\)/);
  assert.match(client, /if \(!width \|\| !height \|\| !bytes\)/);
  assert.match(client, /url\.protocol !== "https:"/);
  assert.match(client, /url\.hostname !== "res\.cloudinary\.com"/);
  assert.match(client, /!url\.pathname\.startsWith\(expectedPath\)/);
});

test("preserves rejected-upload cleanup and transactional batch rollback", async () => {
  const client = await read("../app/rupantar/cloudinary.ts");
  const validation = client.indexOf("return validateUploadedImage(uploaded, signed, file, sortOrder)");
  const rejectedCleanup = client.indexOf("await deleteCloudinaryImages([signed.publicId])", validation);
  const completedBatch = client.indexOf("const completed = uploaded.filter((image): image is WorkImage => image !== undefined)");
  const batchRollback = client.indexOf("await deleteCloudinaryImages(completed.map((image) => image.publicId))", completedBatch);

  assert.ok(validation >= 0);
  assert.ok(rejectedCleanup > validation);
  assert.ok(completedBatch >= 0);
  assert.ok(batchRollback > completedBatch);
  assert.match(client, /automatic cleanup on the next Admin session/);
});

test("adds previews only after the full validated batch succeeds", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const upload = site.indexOf("const uploaded = await uploadWorkImages(files)");
  const append = site.indexOf("images: [...(Array.isArray(current.images) ? current.images : []), ...uploaded]", upload);

  assert.ok(upload >= 0);
  assert.ok(append > upload);
});

test("removes new draft images from Cloudinary before removing their preview", async () => {
  const [site, admin] = await Promise.all([
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/admin.tsx"),
  ]);
  const handler = site.indexOf("const handleRemoveWorkImage = async");
  const persisted = site.indexOf("const persisted = persistedDraftImageIdsRef.current.has(image.publicId)", handler);
  const destroy = site.indexOf("if (!persisted) await deleteCloudinaryImages([image.publicId])", persisted);
  const removePreview = site.indexOf("setWorkForm((current)", destroy);

  assert.ok(handler >= 0);
  assert.ok(persisted > handler);
  assert.ok(destroy > persisted);
  assert.ok(removePreview > destroy);
  assert.match(admin, /aria-label="Remove image"/);
  assert.match(admin, /disabled=\{busy \|\| uploadingImages\}/);
  assert.match(admin, /onClick=\{\(\) => void onRemoveWorkImage\(index\)\}/);
});

test("keeps persisted image removal draft-only until a successful save", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const handler = site.indexOf("const handleRemoveWorkImage = async");
  const conditionalDelete = site.indexOf("if (!persisted) await deleteCloudinaryImages([image.publicId])", handler);
  const save = site.indexOf("savedWork = await saveWork(formSnapshot, editingId)");
  const deleteRemoved = site.indexOf("await deleteCloudinaryImages(removed)", save);

  assert.ok(conditionalDelete > handler);
  assert.ok(save >= 0);
  assert.ok(deleteRemoved > save);
});

test("cancel cleans only unsaved draft assets and preserves persisted originals", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const draftIds = site.indexOf("const draftImagePublicIds = () =>");
  const excludesPersisted = site.indexOf("!persisted.has(publicId)", draftIds);
  const cancel = site.indexOf("const cancelWork = async");
  const cleanup = site.indexOf("await deleteCloudinaryImages(draftImagePublicIds())", cancel);
  const reset = site.indexOf("setWorkForm(emptyWork)", cleanup);

  assert.ok(draftIds >= 0);
  assert.ok(excludesPersisted > draftIds);
  assert.ok(cancel >= 0);
  assert.ok(cleanup > cancel);
  assert.ok(reset > cleanup);
});

test("failed saves clean new uploads without destroying persisted images", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const newlyUploaded = site.indexOf("const newlyUploaded = draftImagePublicIds()");
  const save = site.indexOf("savedWork = await saveWork(formSnapshot, editingId)", newlyUploaded);
  const cleanupNew = site.indexOf("await deleteCloudinaryImages(newlyUploaded)", save);
  const cleanupRemoved = site.indexOf("await deleteCloudinaryImages(removed)", cleanupNew);

  assert.ok(newlyUploaded >= 0);
  assert.ok(save > newlyUploaded);
  assert.ok(cleanupNew > save);
  assert.ok(cleanupRemoved > cleanupNew);
});

test("Work save and upload handlers reject overlapping in-flight operations", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const save = site.slice(site.indexOf("const handleSaveWork = async"), site.indexOf("const editWork"));
  const upload = site.slice(site.indexOf("const handleUploadImages = async"), site.indexOf("const handleRemoveWorkImage"));

  assert.match(save, /if \(adminMutationRef\.current \|\| uploadMutationRef\.current\) return;/);
  assert.match(upload, /if \(!files\.length \|\| uploadMutationRef\.current \|\| adminMutationRef\.current\) return;/);
});

test("keeps Cloudinary delete operations authenticated, bounded, reference-safe, and draft-aware", async () => {
  const endpoint = await read("../functions/api/cloudinary-delete.ts");

  assert.match(endpoint, /await requireAdmin\(request, runtime\)/);
  assert.match(endpoint, /body\.publicIds\.length === 0 \|\| body\.publicIds\.length > 20/);
  assert.match(endpoint, /value\.trim\(\)\.length <= 255/);
  assert.match(endpoint, /new Set\(body\.publicIds\.map/);
  assert.match(endpoint, /claim_unreferenced_cloudinary_images/);
  assert.match(endpoint, /complete_cloudinary_draft_cleanup/);
  assert.match(endpoint, /for \(const publicId of claimedPublicIds\)/);
});

test("preserves optimized public Cloudinary delivery", async () => {
  const shared = await read("../app/rupantar/shared.tsx");

  assert.match(shared, /c_limit,w_\$\{width\}\/f_auto\/q_auto:good/);
});
