import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "SELLER" | "ADMIN" | "STAFF";
      permissions?: string[] | null;
      status?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "CUSTOMER" | "SELLER" | "ADMIN" | "STAFF";
    permissions?: string[] | null;
    status?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "CUSTOMER" | "SELLER" | "ADMIN" | "STAFF";
    permissions?: string[] | null;
    status?: string;
  }
}
