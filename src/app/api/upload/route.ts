import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE = 5 * 1024 * 1024;
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";
const UPLOAD_FAILED = "ছবি আপলোড ব্যর্থ হয়েছে, আবার চেষ্টা করুন";

type ImgbbResponse = {
  success?: boolean;
  data?: { url?: string };
  error?: { message?: string; code?: number };
};

// শুধু অ্যাডমিন ও সেলার; ছবি imgbb-তে (কী থাকলে) বা নিজের ডেটাবেসে যায়, কী সার্ভারেই থাকে
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SELLER") {
    return NextResponse.json({ error: "অনুমতি নেই" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ছবির ফাইল দরকার" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "শুধু JPG/PNG/WebP/GIF ছবি আপলোড করা যাবে" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "ছবি সর্বোচ্চ ৫MB হতে পারবে" },
      { status: 400 }
    );
  }

  const apiKey = process.env.IMGBB_API_KEY;
  // imgbb কী না থাকলে ছবিটি ডেটাবেসে রেখে নিজের সার্ভার থেকেই সার্ভ করা হয়
  if (!apiKey) {
    try {
      const asset = await prisma.mediaAsset.create({
        data: {
          mimeType: file.type,
          size: file.size,
          data: new Uint8Array(await file.arrayBuffer()),
        },
      });
      return NextResponse.json({ url: `/api/images/${asset.id}` });
    } catch (e) {
      console.error("[upload] ডেটাবেসে ছবি রাখা যায়নি:", e);
      return NextResponse.json({ error: UPLOAD_FAILED }, { status: 502 });
    }
  }

  const body = new FormData();
  body.append("key", apiKey);
  body.append("image", file);

  try {
    const res = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as ImgbbResponse;
    const url = data.data?.url;
    if (!res.ok || !data.success || !url) {
      console.error("[upload] imgbb ব্যর্থ:", res.status, data.error?.code, data.error?.message);
      return NextResponse.json({ error: UPLOAD_FAILED }, { status: 502 });
    }
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[upload] imgbb সংযোগ ব্যর্থ:", e);
    return NextResponse.json({ error: UPLOAD_FAILED }, { status: 502 });
  }
}
