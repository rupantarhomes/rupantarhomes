import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
export function compile(text, modules, globals = {}) {
  const output = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), output)(
    (name) => Object.hasOwn(modules, name) ? modules[name] : require(name), module, module.exports, ...Object.values(globals));
  return module.exports;
}
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
export const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
export function dataFixture(repository, now = () => Date.now()) {
  return compile(source('app/rupantar/public-data.ts'), { './repository': repository, './blog-project-link': repository }, { Date: { now } });
}
export function siteFixture(repository, { path = '/', now } = {}) {
  const data = dataFixture(repository, now);
  const routes = compile(source('app/rupantar/routes.ts'), {});
  const effects = [], slots = [], listeners = new Map(), errors = [], scrolls = [];
  let cursor = 0, historyIndex = 0;
  const history = [path];
  const window = {
    location: { pathname: path, reload() { throw Error('document reload'); }, assign() { throw Error('document navigation'); } },
    history: { pushState(_state, _title, path) { history.splice(++historyIndex); history.push(path); window.location.pathname = path; } },
    addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); },
    scrollTo(value) { scrolls.push(value); }, setTimeout() { return 0; }, clearTimeout() {},
  };
  const hooks = {
    useState(initial) { const id = cursor++; if (!(id in slots)) slots[id] = typeof initial === 'function' ? initial() : initial; return [slots[id], (value) => { slots[id] = typeof value === 'function' ? value(slots[id]) : value; }]; },
    useRef(initial) { const id = cursor++; return slots[id] ??= { current: initial }; },
    useCallback(fn) { return fn; }, useEffect(fn) { effects.push(fn); }, lazy() { return () => null; },
  };
  // Expose real handler closures and their hook state. No implementation is copied
  // into this harness; only the final JSX return is replaced (no DOM/timing claims).
  const siteSource = process.env.NAVIGATION_BASE_REF ? execFileSync('git', ['show', `${process.env.NAVIGATION_BASE_REF}:app/rupantar/site.tsx`], { encoding: 'utf8' }) : source('app/rupantar/site.tsx');
  const file = ts.createSourceFile('site.tsx', siteSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const site = file.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'RupantarSite');
  const lastReturn = site.body.statements.at(-1);
  if (!ts.isReturnStatement(lastReturn)) throw Error('Expected final public render');
  const replacement = 'return { page, filter, works, worksLoading, worksTotal, blogs, blogsLoading, blogsLoaded, selectedWork, selectedBlog, detailLoadError, navigate, openCategory, openWork, openBlog, applyBrowserRoute, refreshContent, refreshBlogs, loadWorks };';
  const text = file.text.slice(0, lastReturn.getStart(file)) + replacement + file.text.slice(lastReturn.end);
  const fallback = new Proxy({}, { get: (_, key) => key === 'then' ? undefined : () => null });
  const modules = {
    react: hooks, './repository': { ...repository, getCurrentAdminSession: async () => null }, './public-data': data,
    './routes': routes, './supabase': { isSupabaseConfigured: true }, './blog': { emptyBlogForm: {} },
    './cloudinary': {}, './types': {}, './shared': {}, './home-page': {}, './error-boundary': {},
    './data': { initialWorks: [{ id: 'DEMO' }], initialReviews: [], initialSettings: {}, emptyEstimate: {}, emptyQuery: {}, emptyWork: {}, emptyReview: {} },
    './public-pages': fallback, './blog-pages': fallback,
  };
  const { RupantarSite } = compile(text, modules, { window, document: { title: '' }, console: { error: (...args) => errors.push(args) } });
  function render() { cursor = 0; effects.length = 0; return RupantarSite(); }
  function mount() { render(); const startup = effects.find(fn => fn.toString().includes('document.title')); if (!startup) throw Error('Missing startup effect'); startup(); return render(); }
  async function pop(path) { window.location.pathname = path; await render().applyBrowserRoute(); return render(); }
  async function back() { window.location.pathname = history[--historyIndex]; await render().applyBrowserRoute(); return render(); }
  async function forward() { window.location.pathname = history[++historyIndex]; await render().applyBrowserRoute(); return render(); }
  return { render, mount, pop, back, forward, data, window, errors, scrolls, listeners };
}
