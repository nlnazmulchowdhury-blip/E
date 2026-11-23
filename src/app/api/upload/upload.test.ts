import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

const IMGBB_URL = "https://i.ibb.co/demo/photo.png";

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

function okResponse(url = IMGBB_URL) {
  return new Response(JSON.stringify({ success: true, data: { url } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.IMGBB_API_KEY = "test-key";
  fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.IMGBB_API_KEY;
});

describe("POST /api/upload", () => {
  it("লগইন না করা ইউজার আপলোড করতে পারে না", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CUSTOMER আপলোড করতে পারে না", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1", role: "CUSTOMER" } });

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("API কী সেট না থাকলে 500 দেয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    delete process.env.IMGBB_API_KEY;

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ADMIN বৈধ PNG আপলোড করলে imgbb URL ফেরত আসে", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe(IMGBB_URL);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.imgbb.com/1/upload");
    const body = init.body as FormData;
    expect(body.get("key")).toBe("test-key");
    expect(body.get("image")).toBeInstanceOf(File);
  });

  it("SELLER বৈধ JPEG আপলোড করতে পারে", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "s1", role: "SELLER" } });

    const res = await POST(fileRequest("image/jpeg"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe(IMGBB_URL);
  });

  it("imgbb ব্যর্থ হলে 502 দেয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: "boom" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );

    const res = await POST(fileRequest("image/png"));

    expect(res.status).toBe(502);
  });
});
