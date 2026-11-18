import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProductsByCategory } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const { products, total, pages } = await getProductsByCategory(slug, page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/categories" className="hover:text-foreground">
          ক্যাটাগরি
        </Link>
        {" / "}
        <span className="text-foreground">{category.name}</span>
      </nav>
      <h1 className="mb-1 text-2xl font-bold">{category.name}</h1>
      {category.description && (
        <p className="mb-2 text-sm text-muted-foreground">{category.description}</p>
      )}
      <p className="mb-8 text-sm text-muted-foreground">{total}টি প্রোডাক্ট পাওয়া গেছে</p>

      {products.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          এই ক্যাটাগরিতে এখনো কোনো প্রোডাক্ট নেই
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
                <PaginationPrevious href={`/categories/${slug}?page=${page - 1}`} />
              </PaginationItem>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href={`/categories/${slug}?page=${p}`}
                  isActive={p === page}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            {page < pages && (
              <PaginationItem>
                <PaginationNext href={`/categories/${slug}?page=${page + 1}`} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
