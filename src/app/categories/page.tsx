import Link from "next/link";
import { getCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "সব ক্যাটাগরি" };

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">সব ক্যাটাগরি</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        আপনার পছন্দের ক্যাটাগরি বেছে নিন
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="flex flex-col gap-2 rounded-xl border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span className="text-3xl">🛍️</span>
            <span className="font-semibold">{c.name}</span>
            {c.description && (
              <span className="text-xs text-muted-foreground">{c.description}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {c._count.products} প্রোডাক্ট
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
