import { describe, expect, it } from "vitest";
import { authConfig } from "@/auth.config";

function req(path: string) {
  return { nextUrl: new URL(`http://localhost:3000${path}`) };
}

function callAuthorized(
  path: string,
  auth: { user?: { id: string; role: string; status?: string } } | null
) {
  const cb = authConfig.callbacks!.authorized!;
  return cb({ auth, request: req(path) } as never);
}

describe("authConfig.authorized", () => {
  it("লগইন ছাড়া /admin → লগইন পেজে রিডাইরেক্ট", () => {
    const res = callAuthorized("/admin", null) as Response;
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fadmin"
    );
  });

  it("CUSTOMER /admin → access-denied", () => {
    const res = callAuthorized("/admin", { user: { id: "u1", role: "CUSTOMER" } }) as Response;
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/access-denied");
  });

  it("ADMIN /admin → অনুমোদিত", () => {
    expect(callAuthorized("/admin", { user: { id: "u1", role: "ADMIN" } })).toBe(true);
  });

  it("লগইন ছাড়া /seller → লগইন পেজে রিডাইরেক্ট", () => {
    const res = callAuthorized("/seller", null) as Response;
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fseller"
    );
  });

  it("ADMIN /seller → access-denied", () => {
    const res = callAuthorized("/seller", { user: { id: "u1", role: "ADMIN" } }) as Response;
    expect(res.headers.get("location")).toBe("http://localhost:3000/access-denied");
  });

  it("SELLER /seller → অনুমোদিত", () => {
    expect(callAuthorized("/seller", { user: { id: "u1", role: "SELLER" } })).toBe(true);
  });

  it("/account ও /checkout শুধু লগইন চায়", () => {
    expect(callAuthorized("/account/orders", null)).toBe(false);
    expect(
      callAuthorized("/account/orders", { user: { id: "u1", role: "CUSTOMER" } })
    ).toBe(true);
    expect(callAuthorized("/checkout", { user: { id: "u1", role: "CUSTOMER" } })).toBe(true);
  });

  it("সাধারণ পেজ সবার জন্য খোলা", () => {
    expect(callAuthorized("/", null)).toBe(true);
    expect(callAuthorized("/products/abc", null)).toBe(true);
  });

  it("SUSPENDED ইউজার /account-এ access-denied পায়", () => {
    const res = callAuthorized("/account/orders", {
      user: { id: "u1", role: "CUSTOMER", status: "SUSPENDED" },
    }) as Response;
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/access-denied");
  });

  it("SUSPENDED ইউজার /checkout-এ access-denied পায়", () => {
    const res = callAuthorized("/checkout", {
      user: { id: "u1", role: "CUSTOMER", status: "SUSPENDED" },
    }) as Response;
    expect(res.headers.get("location")).toBe("http://localhost:3000/access-denied");
  });

  it("SUSPENDED ইউজার /admin-এ access-denied পায়", () => {
    const res = callAuthorized("/admin", {
      user: { id: "u1", role: "ADMIN", status: "SUSPENDED" },
    }) as Response;
    expect(res.headers.get("location")).toBe("http://localhost:3000/access-denied");
  });

  it("SUSPENDED ইউজার সাধারণ পেজ দেখতে পারে", () => {
    expect(
      callAuthorized("/", { user: { id: "u1", role: "CUSTOMER", status: "SUSPENDED" } })
    ).toBe(true);
  });

  it("jwt ও session ক্যালব্যাকে status বহন হয়", () => {
    const jwt = authConfig.callbacks!.jwt!;
    const session = authConfig.callbacks!.session!;

    const token = jwt({
      token: {} as never,
      user: { id: "u1", role: "CUSTOMER", status: "ACTIVE" } as never,
      account: null as never,
      profile: undefined as never,
    });
    expect(token.status).toBe("ACTIVE");

    const s = session({
      session: { user: { id: "u1" } } as never,
      token: { ...token, status: "SUSPENDED" } as never,
    } as never);
    expect((s as { user: { status?: string } }).user.status).toBe("SUSPENDED");
  });
});
