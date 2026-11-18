"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { adminRequestSchema, loginSchema, registerSchema } from "@/lib/validation";
import { auth, signIn } from "@/auth";

export type AuthState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "ফর্মে ভুল আছে, ঠিক করে আবার চেষ্টা করুন",
    };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে"] } };
  }

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      password: await bcrypt.hash(password, 10),
    },
  });

  redirect("/login?registered=1");
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "ফর্মে ভুল আছে, ঠিক করে আবার চেষ্টা করুন",
    };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user?.status === "SUSPENDED") {
    return { message: "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে — সাপোর্টে যোগাযোগ করুন" };
  }

  const redirectTo =
    user?.role === "ADMIN" ? "/admin" : user?.role === "SELLER" ? "/seller" : "/";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { message: "ইমেইল বা পাসওয়ার্ড সঠিক নয়" };
    }
    throw error;
  }
  return {};
}

export async function requestAdminRole(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-admin");
  if (session.user.role === "ADMIN") {
    return { errors: { form: ["আপনি ইতিমধ্যে অ্যাডমিন"] } };
  }

  const parsed = adminRequestSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // প্রতি ইউজারের একটিই রিকোয়েস্ট থাকে — নতুন রিকোয়েস্টে আগেরটা রিসেট হয়
  await prisma.adminRequest.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, reason: parsed.data.reason },
    update: {
      reason: parsed.data.reason,
      status: "PENDING",
      createdAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
    },
  });

  revalidatePath("/become-admin");
  return { message: "অনুরোধ পাঠানো হয়েছে — অ্যাডমিন রিভিউ করবে" };
}
