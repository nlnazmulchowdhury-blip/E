import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "রেজিস্টার" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <RegisterForm />
    </div>
  );
}
