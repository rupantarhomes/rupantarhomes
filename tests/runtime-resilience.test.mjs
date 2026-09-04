import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function loadBoundary() {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(read("app/rupantar/error-boundary.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  new Function("require", "module", "exports", outputText)(require, module, module.exports);
  return module.exports.SiteErrorBoundary;
}

test("a failed surface recovers on navigation, not on an unrelated rerender", () => {
  const Boundary = loadBoundary();
  const boundary = new Boundary({ resetKey: "/works/interior/one", children: "healthy" });
  boundary.state = Boundary.getDerivedStateFromError(new Error("fixture render failure"));
  boundary.setState = (state) => { boundary.state = { ...boundary.state, ...state }; };
  assert.equal(typeof boundary.componentDidUpdate, "function");
  boundary.componentDidUpdate({ resetKey: "/works/interior/one" });
  assert.equal(boundary.state.failed, true, "no retry loop on the same failing page");
  boundary.props = { resetKey: "/about", children: "healthy" };
  boundary.componentDidUpdate({ resetKey: "/works/interior/one" });
  assert.equal(boundary.state.failed, false);
  assert.equal(boundary.render(), "healthy");
});

test("optional intro failure stays diagnosable without replacing the site", () => {
  const Boundary = loadBoundary();
  const boundary = new Boundary({ fallback: null, children: "intro" });
  boundary.state = { failed: true };
  assert.equal(boundary.render(), null);
  const original = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try { boundary.componentDidCatch(new Error("fixture"), { componentStack: "BrandIntro" }); }
  finally { console.error = original; }
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1].message, "fixture");
  assert.equal(errors[0][2], "BrandIntro");
});

test("healthy boundaries add no DOM or change existing child markup", () => {
  const Boundary = loadBoundary();
  const children = React.createElement("section", { className: "existing" }, "unchanged");
  assert.equal(renderToStaticMarkup(React.createElement(Boundary, { resetKey: "home" }, children)), renderToStaticMarkup(children));
});

test("page and Admin tab boundaries leave navigation and parent form state outside", () => {
  const site = read("app/rupantar/site.tsx");
  const admin = read("app/rupantar/admin.tsx");
  const entry = read("app/client-entry.tsx");
  assert.match(site, /<PublicHeader[^\n]*\n\s*\n\s*<SiteErrorBoundary resetKey=\{[^\n]+\}>[\s\S]*page === "home"[\s\S]*<\/SiteErrorBoundary>\s*\n\s*\n\s*\{publicPage && <PublicFooter/);
  assert.match(admin, /<SiteErrorBoundary resetKey=\{page\}>[\s\S]*<AdminDashboard[\s\S]*<AdminSettings[\s\S]*<\/SiteErrorBoundary>/);
  assert.match(entry, /<RupantarSite \/>\s*<SiteErrorBoundary fallback=\{null\}>\s*<BrandIntro enabled=\{showBrandIntro\} \/>\s*<\/SiteErrorBoundary>/);
});

function functionSource(path, name) {
  const file = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  return ts.transpileModule(declaration.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

test("intent and idle prefetch failures are handled without loading Admin or changing destinations", async () => {
  for (const [name, args, expected] of [
    ["prefetchPublicPageModules", [], ["public", "blog"]],
    ["prefetchPublicRoute", ["works"], ["public"]],
    ["prefetchPublicRoute", ["blog-detail"], ["blog"]],
    ["prefetchPublicRoute", ["home"], []],
    ["prefetchPublicRoute", ["admin-dashboard"], []],
  ]) {
    const loaded = [];
    const handled = [];
    const logs = [];
    const loader = (label) => () => {
      loaded.push(label);
      const rejected = Promise.reject(new Error(`${label} unavailable`));
      // Observe the fixture ourselves so vulnerable code fails an assertion,
      // rather than creating an unhandled rejection in the test runner.
      rejected.catch(() => {});
      const catchRejection = rejected.catch.bind(rejected);
      rejected.catch = (handler) => { handled.push(label); return catchRejection(handler); };
      return rejected;
    };
    const fn = new Function("loadPublicPages", "loadBlogPages", "publicPages", "console", `${functionSource("app/rupantar/site.tsx", name)}; return ${name};`)(
      loader("public"), loader("blog"), ["home", "works", "blog-detail"], { error: (...args) => logs.push(args) },
    );
    fn(...args);
    await Promise.resolve();
    assert.deepEqual(loaded, expected);
    assert.deepEqual(handled, expected, `${name}: rejected speculative loads must be handled`);
    assert.equal(logs.length, expected.length, "failure remains diagnosable");
  }
});

test("early chunk warming and startup session discovery have rejection handlers", () => {
  const runtime = read("app/public-performance.ts");
  assert.match(runtime, /import\("\.\/rupantar\/public-pages"\)\.catch\(/);
  assert.match(runtime, /import\("\.\/rupantar\/blog-pages"\)\.catch\(/);
  const site = read("app/rupantar/site.tsx");
  assert.match(site, /getCurrentAdminSession\(\)\.then\([\s\S]*?cleanupExpiredWorkDrafts\(\);\s*\}\)\.catch\(/);
});
