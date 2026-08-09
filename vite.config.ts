import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mockApiUrl = env.E2E_MOCK_API_URL?.trim();

  return {
    plugins: [react()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
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
