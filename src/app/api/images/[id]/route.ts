import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ডেটাবেসে রাখা আপলোড করা ছবি সার্ভ করে (পাবলিক, দীর্ঘ ক্যাশ)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { mimeType: true, data: true, size: true },
  });
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      "content-type": asset.mimeType,
      "content-length": String(asset.size),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
