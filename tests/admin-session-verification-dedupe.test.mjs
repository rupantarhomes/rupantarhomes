import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin session verification is single-flight and does not run stale-draft cleanup on focus or visibility", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const verifyStart = site.indexOf("const verifyOpenAdminAccess = useCallback");
  const verifyEnd = site.indexOf("const applyBrowserRoute", verifyStart);
  const verify = site.slice(verifyStart, verifyEnd);
  const lifecycleStart = site.indexOf("useEffect(() => {", site.indexOf("auth.onAuthStateChange") - 300);
  const lifecycleEnd = site.indexOf("const pushPath", lifecycleStart);
  const lifecycle = site.slice(lifecycleStart, lifecycleEnd);
  const startup = site.slice(site.indexOf("void getCurrentAdminSession()"), site.indexOf("const onPopState"));
  const login = site.slice(site.indexOf("const handleLogin = async"), site.indexOf("const handleLogout"));

  assert.match(site, /const adminVerificationPromiseRef = useRef<Promise<void> \| null>\(null\)/);
  assert.match(verify, /if \(adminVerificationPromiseRef\.current\) \{[\s\S]*await adminVerificationPromiseRef\.current;[\s\S]*return;/);
  assert.match(verify, /const verification = \(async \(\) => \{/);
  assert.match(verify, /adminVerificationPromiseRef\.current = verification/);
  assert.match(verify, /if \(adminVerificationPromiseRef\.current === verification\) adminVerificationPromiseRef\.current = null/);
  assert.doesNotMatch(verify, /cleanupExpiredWorkDrafts/);
  assert.match(lifecycle, /window\.addEventListener\("focus", verifyWhenVisible\)/);
  assert.match(lifecycle, /document\.addEventListener\("visibilitychange", verifyWhenVisible\)/);
  assert.match(lifecycle, /setInterval\(\(\) => void verifyOpenAdminAccess\(\), adminVerificationIntervalMs\)/);
  assert.match(startup, /void cleanupExpiredWorkDrafts\(\)/);
  assert.match(login, /void cleanupExpiredWorkDrafts\(\)/);
});
