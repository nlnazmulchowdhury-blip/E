import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { type StaffPermission } from "@/lib/staff-permissions";

export function hasPermission(
  user: { role: string; permissions?: string[] | null },
  perm: StaffPermission
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

// perm দেওয়া থাকলে STAFF-এর সেই পারমিশন লাগবে; না দিলে শুধু ADMIN।
// সফল হলে অ্যাক্টিং ইউজারের id ফেরত দেয়, নইলে রিডাইরেক্ট করে।
export async function requireAdminOrStaff(perm?: StaffPermission): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role === "ADMIN") return session.user.id;
  if (perm && session.user.role === "STAFF" && hasPermission(session.user, perm)) {
    return session.user.id;
  }
  redirect("/access-denied");
}
