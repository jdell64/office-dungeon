import { defineConfig } from "vite";

const base = process.env.VITE_BASE?.trim() || "./";

export default defineConfig({
  root: ".",
  base,
  server: {
    port: 5173,
  },
});
