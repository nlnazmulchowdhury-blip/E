import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Next.js-এর জন্য tsconfig-এ `jsx: "preserve"` থাকে, কিন্তু ভিটেস্টকে JSX
  // সরাসরি ট্রান্সফর্ম করতে হয়, নইলে টেস্ট ফাইল পার্সই হয় না।
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
