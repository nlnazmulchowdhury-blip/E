import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("node:fs/promises", () => ({
  mkdir: mocks.mkdir,
  writeFile: mocks.writeFile,
}));

function makeRequest(form?: FormData) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: form ?? new FormData(),
  });
}

function fileRequest(type: string, size = 10) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(size)], "photo", { type }));
  return makeRequest(fd);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.writeFile.mockResolvedValue(undefined);
  mocks.mkdir.mockResolvedValue(undefined);
});

describe("POST /api/upload", () => {
  it("লগইন না করা ইউজার আপলোড করতে পারে না", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(403);
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it("CUSTOMER আপলোড করতে পারে না", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1", role: "CUSTOMER" } });

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(403);
  });

  it("ফাইল ছাড়া রিকোয়েস্ট ব্যর্থ হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("ফাইল");
  });

  it("ছবি নয় এমন ফাইল বাতিল হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });

    const res = await POST(fileRequest("application/pdf"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("JPG/PNG");
  });

  it("৫MB-এর বড় ছবি বাতিল হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });

    const res = await POST(fileRequest("image/png", 5 * 1024 * 1024 + 1));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("৫MB");
  });

  it("ADMIN বৈধ PNG আপলোড করলে URL ফেরত আসে", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/^\/uploads\/[a-z0-9-]+\.png$/);
    expect(mocks.mkdir).toHaveBeenCalled();
    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
  });

  it("SELLER বৈধ JPEG আপলোড করলে .jpg এক্সটেনশন হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "s1", role: "SELLER" } });

    const res = await POST(fileRequest("image/jpeg"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/\.jpg$/);
  });
});
