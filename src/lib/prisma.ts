import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers-এ এক রিকোয়েস্টে খোলা সকেট পরের রিকোয়েস্টে ব্যবহার করা যায় না —
// পুল কানেকশন রিইউজ করলে পরের রিকোয়েস্ট চিরকাল হ্যাং করে। তাই Workers-এ
// প্রতিটি কুয়েরি নতুন কানেকশনে চালাই (প্রোডাকশনে Hyperdrive পুলিং সামলায়)।
const isWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Node-এ (লোকাল dev / সাধারণ সার্ভার) প্রসেস-লাইফটাইম কানেকশন পুল কাজে লাগে,
  // তাই শুধু Workers-এ পুলিং সীমিত করি। node-postgres অ্যাডাপ্টার দুই জায়গাতেই চলে।
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      ...(isWorkers ? { max: 5, maxUses: 1, allowExitOnIdle: true } : {}),
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
