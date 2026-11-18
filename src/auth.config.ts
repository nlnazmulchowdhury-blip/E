import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.permissions = (user as { permissions?: string[] | null }).permissions ?? [];
        token.status = (user as { status?: string }).status ?? "ACTIVE";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CUSTOMER" | "SELLER" | "ADMIN" | "STAFF";
        session.user.permissions = (token.permissions as string[] | null) ?? [];
        session.user.status = token.status as string | undefined;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as string | undefined;
      const isSuspended = auth?.user?.status === "SUSPENDED";
      const protectedPath =
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/seller") ||
        nextUrl.pathname.startsWith("/account") ||
        nextUrl.pathname.startsWith("/checkout");

      if (isSuspended && protectedPath) {
        return NextResponse.redirect(new URL("/access-denied", nextUrl));
      }

      if (nextUrl.pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
          return NextResponse.redirect(
            new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl)
          );
        }
        if (role !== "ADMIN" && role !== "STAFF") {
          return NextResponse.redirect(new URL("/access-denied", nextUrl));
        }
        return true;
      }
      if (nextUrl.pathname.startsWith("/seller")) {
        if (!isLoggedIn) {
          return NextResponse.redirect(
            new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl)
          );
        }
        if (role !== "SELLER") {
          return NextResponse.redirect(new URL("/access-denied", nextUrl));
        }
        return true;
      }
      if (
        nextUrl.pathname.startsWith("/account") ||
        nextUrl.pathname.startsWith("/checkout")
      ) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
