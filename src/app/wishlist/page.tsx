import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@/auth";
import { getWishlist } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "উইশলিস্ট" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await getWishlist(session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">আমার উইশলিস্ট</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-20 text-center">
          <Heart className="size-16 text-muted-foreground" />
          <p className="text-muted-foreground">আপনার উইশলিস্ট খালি</p>
          <Button asChild>
            <Link href="/categories">প্রোডাক্ট দেখুন</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
