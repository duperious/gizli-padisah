import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages proje siteleri /<repo>/ altında yayınlanır.
const base = process.env.GITHUB_PAGES_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Savaş Konseyi",
        short_name: "Savaş Konseyi",
        description:
          "Gizli rollerle oynanan çevrim içi savaş konseyi oyunu. Barışçıllar mı, Saldırganlar mı?",
        lang: "tr",
        dir: "ltr",
        theme_color: "#17110d",
        background_color: "#17110d",
        display: "standalone",
        orientation: "portrait",
        categories: ["games", "entertainment"],
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
