import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dist = new URL("../dist/", import.meta.url);
const limits = {
  totalJavaScript: 500_000,
  entryJavaScript: 380_000,
  entryJavaScriptGzip: 120_000,
  totalCss: 130_000,
  largestImage: 225_000,
  totalBuild: 4_750_000,
};

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesUnder(new URL(`${entry.name}/`, directory))
    : Promise.resolve(new URL(entry.name, directory))))).flat();
}

const files = await filesUnder(dist);
const sizes = await Promise.all(files.map(async (file) => ({
  file,
  name: file.pathname.slice(dist.pathname.length),
  size: (await stat(file)).size,
})));
const js = sizes.filter(({ name }) => name.startsWith("assets/") && name.endsWith(".js"));
const css = sizes.filter(({ name }) => name.startsWith("assets/") && name.endsWith(".css"));
const images = sizes.filter(({ name }) => /\.(?:webp|png|jpe?g)$/i.test(name));
const entry = js.filter(({ name }) => /assets\/index-[^/]+\.js$/.test(name)).sort((a, b) => b.size - a.size)[0];

if (!entry) throw new Error("Production entry JavaScript was not emitted");
const entryGzip = gzipSync(await readFile(entry.file)).byteLength;
const actual = {
  totalJavaScript: js.reduce((sum, file) => sum + file.size, 0),
  entryJavaScript: entry.size,
  entryJavaScriptGzip: entryGzip,
  totalCss: css.reduce((sum, file) => sum + file.size, 0),
  largestImage: Math.max(0, ...images.map((file) => file.size)),
  totalBuild: sizes.reduce((sum, file) => sum + file.size, 0),
};

const failures = Object.entries(limits)
  .filter(([key, limit]) => actual[key] > limit)
  .map(([key, limit]) => `${key}: ${actual[key]} bytes exceeds ${limit}`);

console.log(JSON.stringify({ actual, limits }, null, 2));
if (failures.length) throw new Error(`Production performance budget failed:\n${failures.join("\n")}`);
