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
  assert.match(client, /file\.size > maximumBytes/);
  assert.match(client, /body\.set\("format", signed\.format\)/);
  assert.match(client, /if \(format !== "webp"\) throw new Error\(`\$\{file\.name\} was not converted to WebP\.`\);/);
  assert.match(client, /Math\.max\(width, height\) > 1920 \|\| Math\.min\(width, height\) > 1080/);

  assert.match(signature, /format: "webp"/);
  assert.match(signature, /c_limit,h_1080,w_1920\/q_auto:good/);
  assert.doesNotMatch(signature, /f_webp/);
});

test("preserves rejected-upload cleanup and completed-batch rollback", async () => {
  const client = await read("../app/rupantar/cloudinary.ts");
  const validation = client.indexOf("return validateUploadedImage(uploaded, signed, file, sortOrder)");
  const rejectedCleanup = client.indexOf("await deleteCloudinaryImages([publicId])", validation);
  const batchRollback = client.indexOf("await deleteCloudinaryImages(uploaded.map((image) => image.publicId))");

  assert.ok(validation >= 0);
  assert.ok(rejectedCleanup > validation);
  assert.ok(batchRollback >= 0);
});
