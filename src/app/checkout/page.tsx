import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCart, getUserAddresses } from "@/lib/data";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummaryCard } from "@/components/checkout/order-summary-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "চেকআউট" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [items, addresses] = await Promise.all([
    getCart(session.user.id),
    getUserAddresses(session.user.id),
  ]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold">কার্ট খালি</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          চেকআউটের আগে কার্টে প্রোডাক্ট যোগ করুন
        </p>
        <Button asChild>
          <Link href="/categories">শপিং করুন</Link>
        </Button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => {
    const unitPrice =
      item.product.isFlashSale && item.product.flashSalePrice
        ? Number(item.product.flashSalePrice)
        : Number(item.product.price);
    return sum + unitPrice * item.quantity;
  }, 0);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const isDhaka = defaultAddress?.division.toLowerCase().includes("dhaka") ?? true;

  const summaryItems = items.map((item) => {
    const unitPrice =
      item.product.isFlashSale && item.product.flashSalePrice
        ? Number(item.product.flashSalePrice)
        : Number(item.product.price);
    return {
      id: item.id,
      image: item.product.images[0]?.url ?? "/placeholder.svg",
      title: item.product.title,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">চেকআউট</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm addresses={addresses} />
        <OrderSummaryCard items={summaryItems} subtotal={subtotal} isDhaka={isDhaka} />
      </div>
    </div>
  );
}
