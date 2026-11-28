"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// এডিট পেজ থেকে ডিলিট — সফট ডিলিট শেষে লিস্ট পেজে ফিরে যায়,
// নাহলে ডিলিট হওয়া প্রোডাক্টের এডিট পেজ রিফ্রেশে 404 দেখাবে।
export default function DeleteProductButton({
  action,
  redirectTo,
  confirmMessage = "এই প্রোডাক্টটি ডিলিট করবেন? পুরোনো অর্ডারের রেকর্ড অক্ষত থাকবে, শুধু সাইট থেকে লুকিয়ে যাবে।",
}: {
  action: () => Promise<void>;
  redirectTo: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async () => {
        setPending(true);
        try {
          await action();
          router.push(redirectTo);
        } finally {
          setPending(false);
        }
      }}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "ডিলিট হচ্ছে..." : "প্রোডাক্ট ডিলিট করুন"}
      </Button>
    </form>
  );
}
