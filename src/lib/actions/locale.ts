"use server";

import { cookies } from "next/headers";

const SUPPORTED = ["bn", "en"];

export async function setLocaleAction(next: string) {
  const locale = SUPPORTED.includes(next) ? next : "bn";
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
