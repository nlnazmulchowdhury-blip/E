import Link from "next/link";
import { SearchX } from "lucide-react";
import { getCategories, searchProducts } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

export const metadata = { title: "প্রোডাক্ট সার্চ" };

function buildUrl(base: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/search${qs ? `?${qs}` : ""}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filters = {
    q: sp.q,
    category: sp.category,
    sort: sp.sort,
    minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
    inStock: sp.inStock === "1",
    page,
  };

  const [categories, { products, total, pages }] = await Promise.all([
    getCategories(),
    searchProducts(filters),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">
        {sp.q ? `"${sp.q}" এর ফলাফল` : "সব প্রোডাক্ট"}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{total}টি প্রোডাক্ট পাওয়া গেছে</p>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Filters */}
        <aside className="space-y-6">
          <form className="space-y-6">
            <Input type="hidden" name="q" value={sp.q ?? ""} />

            <div>
              <Label className="mb-2 block text-sm font-semibold">ক্যাটাগরি</Label>
              <div className="space-y-2">
                <Link
                  href={buildUrl(sp, { category: undefined, page: undefined })}
                  className={`block text-sm ${!sp.category ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  সব ক্যাটাগরি
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={buildUrl(sp, { category: c.slug, page: undefined })}
                    className={`block text-sm ${sp.category === c.slug ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {c.name} ({c._count.products})
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold">দাম (৳)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" name="minPrice" placeholder="সর্বনিম্ন" defaultValue={sp.minPrice} />
                <span className="text-muted-foreground">—</span>
                <Input type="number" name="maxPrice" placeholder="সর্বোচ্চ" defaultValue={sp.maxPrice} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold">সাজান</Label>
              <select
                name="sort"
                defaultValue={sp.sort ?? "newest"}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="newest">নতুন আগে</option>
                <option value="price-asc">দাম: কম থেকে বেশি</option>
                <option value="price-desc">দাম: বেশি থেকে কম</option>
                <option value="rating">সেরা রেটেড</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="inStock" name="inStock" value="1" defaultChecked={sp.inStock === "1"} />
              <Label htmlFor="inStock" className="text-sm">
                শুধু স্টকে আছে
              </Label>
            </div>

            <Button type="submit" className="w-full">
              ফিল্টার প্রয়োগ করুন
            </Button>
            {(sp.q || sp.category || sp.minPrice || sp.maxPrice || sp.inStock) && (
              <Button asChild variant="ghost" className="w-full">
                <Link href="/search">ফিল্টার মুছুন</Link>
              </Button>
            )}
          </form>
        </aside>

        {/* Results */}
        <div>
          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-16 text-center text-muted-foreground">
              <SearchX className="size-10" />
              <p>কোনো প্রোডাক্ট পাওয়া যায়নি</p>
              <p className="text-sm">অন্য কীওয়ার্ড দিয়ে খুঁজে দেখুন</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <Pagination className="mt-10">
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={buildUrl(sp, { page: String(page - 1) })} />
                  </PaginationItem>
                )}
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink href={buildUrl(sp, { page: String(p) })} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {page < pages && (
                  <PaginationItem>
                    <PaginationNext href={buildUrl(sp, { page: String(page + 1) })} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}
