import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin busy-state enhancement observes only the Logout busy signal, not every disabled mutation", async () => {
  const enhancer = await read("../app/rupantar/admin-leads-enhancer.ts");

  assert.match(enhancer, /function findLogoutButton\(\)/);
  assert.match(enhancer, /busyObserver\.observe\(logout, \{ attributes: true, attributeFilter: \["disabled"\] \}\)/);
  assert.match(enhancer, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(enhancer, /observer\.observe\(document\.body, \{[^}]*attributes: true[^}]*attributeFilter: \["disabled"\]/);
  assert.match(enhancer, /control\.dataset\.rhBusyDisabled = "true"/);
  assert.match(enhancer, /delete control\.dataset\.rhBusyDisabled/);
});

test("Work image uploads use bounded concurrency while preserving ordered results and rollback", async () => {
  const cloudinary = await read("../app/rupantar/cloudinary.ts");

  assert.match(cloudinary, /const uploadConcurrency = 3;/);
  assert.match(cloudinary, /const uploaded: Array<WorkImage \| undefined> = new Array\(files\.length\)/);
  assert.match(cloudinary, /uploaded\[index\] = await uploadOne\(files\[index\], index\)/);
  assert.match(cloudinary, /const workerCount = Math\.min\(uploadConcurrency, files\.length\)/);
  assert.match(cloudinary, /await Promise\.all\(Array\.from\(\{ length: workerCount \}, \(\) => worker\(\)\)\)/);
  assert.match(cloudinary, /await deleteCloudinaryImages\(completed\.map\(\(image\) => image\.publicId\)\)/);
  assert.match(cloudinary, /return completed;/);
});
