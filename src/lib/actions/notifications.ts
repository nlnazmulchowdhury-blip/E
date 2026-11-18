"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function markNotificationRead(id: string) {
  const userId = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const userId = await requireUser();
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
}
