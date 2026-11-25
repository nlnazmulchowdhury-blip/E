import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, RotateCcw } from "lucide-react";
import { auth } from "@/auth";
import { getProductBySlug, getRelatedProducts } from "@/lib/data";
import { formatBDT } from "@/lib/format";
import { stockOf } from "@/lib/inventory";
import { StarRating } from "@/components/product/star-rating";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductActions } from "@/components/product/product-actions";
import { OrderContactButtons } from "@/components/product/order-contact-buttons";
import { SellerCard } from "@/components/product/seller-card";
import { ReviewForm } from "@/components/product/review-form";
import { hasDeliveredPurchase } from "@/lib/reviews";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status === "REJECTED" || product.deletedAt) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  // ইউজার-সংক্রান্ত কুয়েরিগুলো একসাথে চালাই (আগে একটার পর একটা চলত)
  const [userReview, canReview, related, wishlisted] = await Promise.all([
    userId
      ? prisma.review.findUnique({
          where: { userId_productId: { userId, productId: product.id } },
        })
      : Promise.resolve(null),
    // প্রোডাক্টটি কিনে হাতে পাওয়ার পরেই রিভিউ দেওয়ার সুযোগ
    userId ? hasDeliveredPurchase(userId, product.id) : Promise.resolve(false),
    getRelatedProducts(product.categoryId, product.id),
    userId
      ? prisma.wishlistItem.findUnique({
          where: { userId_productId: { userId, productId: product.id } },
        })
      : Promise.resolve(null),
  ]);
  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const flashPrice = product.isFlashSale && product.flashSalePrice
    ? Number(product.flashSalePrice)
    : null;
  const displayPrice = flashPrice ?? price;
  const discount = compareAt
    ? Math.round(((compareAt - displayPrice) / compareAt) * 100)
    : null;
  const stock = stockOf(product.inventory);
  const outOfStock = stock === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-2 md:py-8">
      <nav className="mb-0 text-xs text-muted-foreground md:mb-6 md:text-sm">
        <Link href="/" className="hover:text-foreground">হোম</Link>
        {" / "}
        <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        {" / "}
        <span className="line-clamp-1 inline-block max-w-52 align-bottom text-foreground">
          {product.title}
        </span>
      </nav>

      <div className="grid gap-2.5 md:gap-10 lg:grid-cols-2">
        {/* Images */}
        <ProductGallery
          images={product.images}
          title={product.title}
        />

        {/* Info */}
        <div className="space-y-1.5 md:space-y-4">
          <div>
            <h1 className="text-base font-bold leading-5 md:mt-1 md:text-3xl md:leading-9">
              {product.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <div className="flex items-end gap-3">
              <span className="text-2xl font-bold text-primary md:text-4xl">{formatBDT(displayPrice)}</span>
              {compareAt && compareAt > displayPrice && (
                <>
                  <span className="text-sm text-muted-foreground line-through md:text-lg">
                    {formatBDT(compareAt)}
                  </span>
                  {discount !== null && discount > 0 && (
                    <span className="text-sm font-semibold text-primary">-{discount}%</span>
                  )}
                </>
              )}
            </div>

            <p className="pb-1 text-sm font-semibold">
              {outOfStock ? (
                <span className="text-red-600">স্টক নেই</span>
              ) : (
                <span className="text-green-600">স্টকে আছে</span>
              )}
            </p>
          </div>

          <ProductActions
            productId={product.id}
            outOfStock={outOfStock}
            stock={stock}
            initialWishlisted={!!wishlisted}
          />

          <OrderContactButtons title={product.title} slug={product.slug} />

          <ul className="space-y-2.5 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Truck className="size-4 shrink-0 text-primary" />
              সারাদেশে দ্রুত ডেলিভারি
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 shrink-0 text-primary" />
              ঢাকা ৳৬০ · ঢাকার বাইরে ৳১২০
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 shrink-0 text-primary" />
              ৳২,০০০+ অর্ডারে ডেলিভারি মাত্র ৳১০
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="size-4 shrink-0 text-primary" />
              ৭ দিনের রিটার্ন পলিসি
            </li>
          </ul>

          <Separator />

          <div>
            <h2 className="mb-2 font-semibold">প্রোডাক্ট বিবরণ</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <SellerCard
            shop={product.seller?.shop ?? null}
            title={product.title}
            slug={product.slug}
          />
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-14">
        <h2 className="mb-6 text-xl font-bold">রিভিউ ও রেটিং</h2>
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-5xl font-bold">{product.ratingAvg.toFixed(1)}</p>
            <div className="mt-2 flex justify-center">
              <StarRating rating={product.ratingAvg} size="size-5" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {product.ratingCount}টি রিভিউয়ের ভিত্তিতে
            </p>
          </div>
          <div className="space-y-4">
            {canReview ? (
              <ReviewForm productId={product.id} hasReviewed={!!userReview} />
            ) : (
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-2 font-semibold">একটি রিভিউ লিখুন</h3>
                <p className="text-sm text-muted-foreground">
                  {userId ? (
                    "রিভিউ দেওয়া যাবে শুধু প্রোডাক্টটি কিনে হাতে পাওয়ার পরে — অর্ডারটি ডেলিভারড হলে এখানে রেটিং ও মতামত লেখার ঘর দেখা যাবে।"
                  ) : (
                    <>
                      রিভিউ দিতে হলে{" "}
                      <Link href="/login" className="font-medium text-primary hover:underline">
                        লগইন
                      </Link>{" "}
                      করুন এবং প্রোডাক্টটি কিনে হাতে পাওয়ার পরে রিভিউ দিন।
                    </>
                  )}
                </p>
              </div>
            )}
            {product.reviews.length === 0 ? (
              <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                এখনো কোনো রিভিউ নেই — প্রথম রিভিউটি আপনি লিখুন!
              </p>
            ) : (
              product.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {r.user.name?.charAt(0) ?? "?"}
                      </span>
                      <span className="text-sm font-medium">{r.user.name}</span>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {r.comment}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("bn-BD", { dateStyle: "long" }).format(r.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-xl font-bold">সম্পর্কিত প্রোডাক্ট</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
