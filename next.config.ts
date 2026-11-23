import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Classic caching model: e-commerce is fully dynamic (per-user cart/auth),
  // and Cache Components complicate NextAuth v5 integration.
  cacheComponents: false,
  partialPrefetching: false,
  // Next-এর ফাইল ট্রেসিং pg-cloudflare-এর শুধু Node এন্ট্রি (dist/empty.js) কপি করে।
  // Cloudflare Workers বিল্ডে pg-র দরকার dist/index.js + esm — তাই পুরো প্যাকেজ রাখি।
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pg-cloudflare/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
