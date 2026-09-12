import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

function earlyHomeBootstrapPlugin(): Plugin {
  const bootstrapAsset = "/assets/home-bootstrap-early.js";

  return {
    name: "rupantar-early-home-bootstrap",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const preloadPattern = /\s*<link rel="modulepreload" crossorigin href="\/assets\/home-bootstrap-early\.js">/;
        const mainEntryPattern = /<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>/;
        const withoutBootstrapPreload = html.replace(preloadPattern, "");
        if (!mainEntryPattern.test(withoutBootstrapPreload)) return withoutBootstrapPreload;
        return withoutBootstrapPreload.replace(
          mainEntryPattern,
          `<script type="module" crossorigin src="${bootstrapAsset}"></script>\n    $&`,
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mockApiUrl = env.E2E_MOCK_API_URL?.trim();

  return {
    plugins: [react(), earlyHomeBootstrapPlugin()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(process.cwd(), "index.html"),
          homeBootstrap: resolve(process.cwd(), "app/home-bootstrap-early.js"),
        },
        output: {
          entryFileNames: (chunkInfo) =>
            chunkInfo.name === "homeBootstrap" ? "assets/home-bootstrap-early.js" : "assets/[name]-[hash].js",
        },
      },
    },
    server: mockApiUrl
      ? {
          proxy: {
            "/api": mockApiUrl,
          },
        }
      : undefined,
  };
});
