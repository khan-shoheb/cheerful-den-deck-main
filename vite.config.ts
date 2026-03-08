import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function createSupabaseDnsProxy(supabaseTarget: string | undefined) {
  return {
    name: "supabase-dns-proxy",
    configureServer(server: import("vite").ViteDevServer) {
      if (!supabaseTarget) return;

      const target = new URL(supabaseTarget);
      const resolver = new dns.promises.Resolver();
      resolver.setServers(["1.1.1.1", "8.8.8.8"]);

      server.middlewares.use("/supabase", (req, res) => {
        const reqUrl = req.url || "/";
        const pathWithQuery = reqUrl.startsWith("/") ? reqUrl : `/${reqUrl}`;
        const requestFn = target.protocol === "https:" ? https.request : http.request;

        const proxyReq = requestFn(
          {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (target.protocol === "https:" ? 443 : 80),
            method: req.method,
            path: pathWithQuery,
            headers: {
              ...req.headers,
              host: target.host,
            },
            lookup(hostname, _options, callback) {
              const options =
                typeof _options === "number" ? { family: _options, all: false } : { family: 0, all: false, ..._options };

              resolver
                .resolve4(hostname)
                .then((addresses) => {
                  if (!addresses || addresses.length === 0) {
                    callback(new Error(`No DNS A record found for ${hostname}`) as NodeJS.ErrnoException, "", 4);
                    return;
                  }

                  if (options.all) {
                    callback(
                      null,
                      addresses.map((address) => ({ address, family: 4 })),
                    );
                    return;
                  }

                  callback(null, addresses[0], 4);
                })
                .catch((error) => callback(error as NodeJS.ErrnoException, "", 4));
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res);
          },
        );

        proxyReq.on("error", (error) => {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "supabase_proxy_error",
              message: error.message,
            }),
          );
        });

        req.pipe(proxyReq);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseTarget = env.VITE_SUPABASE_URL;

  if (mode === "development") {
    // Use public DNS resolvers in dev to avoid router DNS NXDOMAIN issues.
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
    react(),
      mode === "development" && createSupabaseDnsProxy(supabaseTarget),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.svg", "pwa-512.svg"],
      manifest: {
        name: "Room Management",
        short_name: "RoomMgmt",
        description: "Hotel room management system",
        theme_color: "#1f2937",
        background_color: "#0b1220",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
