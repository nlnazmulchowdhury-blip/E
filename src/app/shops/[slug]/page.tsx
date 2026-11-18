import { notFound } from "next/navigation";
import { Store, MapPin, Package } from "lucide-react";
import { getShopBySlug, getShopProducts } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  return { title: shop?.name ?? "শপ" };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  const profile = shop?.sellerProfile;

  // ডিলিটেড বা অনুমোদনহীন সেলারের শপ পাবলিক নয়
  if (!shop || !profile || profile.deletedAt || profile.status !== "APPROVED") {
    notFound();
  }

  const products = await getShopProducts(profile.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-8">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center">
        {shop.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logoUrl}
            alt={shop.name}
            className="size-20 shrink-0 rounded-xl border object-cover"
          />
        ) : (
          <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-9" />
          </span>
        )}

        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          {shop.address && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              {shop.address}
            </p>
          )}
          {shop.description && (
            <p className="mt-1 text-sm text-muted-foreground">{shop.description}</p>
          )}
        </div>

        <div className="shrink-0 rounded-xl bg-primary/5 px-4 py-2 text-sm font-semibold text-primary sm:ml-auto">
          <Package className="mr-1.5 inline size-4" />
          {profile._count.products}টি প্রোডাক্ট
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold">এই শপের প্রোডাক্ট</h2>
        {products.length === 0 ? (
          <p className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            এই শপে এখনো কোনো প্রোডাক্ট নেই
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
