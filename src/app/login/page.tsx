import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "লগইন" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { registered } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <LoginForm registered={registered === "1"} />
    </div>
  );
}
